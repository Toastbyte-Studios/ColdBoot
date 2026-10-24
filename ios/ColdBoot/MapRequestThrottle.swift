import Foundation
import MapLibre

/// Runs at most four OpenFreeMap requests at a time; MapLibre's others queue.
///
/// OpenFreeMap allows offline downloads at most 4 parallel requests
/// (https://openfreemap.org/quick_start/, "Mobile Apps"). MapLibre Native's
/// offline downloader keeps up to 20 in flight and iOS doesn't expose that
/// limit. Capping connections per host isn't enough either: over HTTP/2 one
/// connection carries many requests. So MapLibre's URL session loads
/// OpenFreeMap URLs through this protocol, which holds each request until one
/// of four slots is free.
///
/// Requests arrive with MapLibre's headers already applied (including
/// ColdBoot's User-Agent) and go out unchanged; responses come back to
/// MapLibre unchanged, 304s included. This applies to the live map too, which
/// is the same host. Android has the same cap in the MapLibre React Native
/// patch (`maxRequestsPerHost = 4`).
final class MapRequestThrottle: URLProtocol {
  static let maxConcurrentRequests = 4

  private static let throttledHost = "tiles.openfreemap.org"

  /// Adds the throttle to MapLibre's URL session. Call before React Native
  /// starts: MapLibre builds that session once, from this configuration, the
  /// first time it needs the network.
  static func install() {
    let network = MLNNetworkConfiguration.sharedManager
    // MapLibre's own defaults (timeouts, no URL cache), plus this protocol.
    guard let configuration = network.sessionConfiguration else { return }
    let throttle: AnyClass = MapRequestThrottle.self
    let others = (configuration.protocolClasses ?? []).filter { $0 != throttle }
    configuration.protocolClasses = [throttle] + others
    network.sessionConfiguration = configuration
  }

  // MARK: Loading

  /// Loads the requests themselves. Its own configuration doesn't list this
  /// protocol, so requests can't loop back through it.
  private static let session: URLSession = {
    let configuration = URLSessionConfiguration.default
    configuration.timeoutIntervalForResource = 30
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    configuration.urlCache = nil
    configuration.httpMaximumConnectionsPerHost = maxConcurrentRequests
    return URLSession(configuration: configuration)
  }()

  private static let gate = RequestGate(limit: maxConcurrentRequests)

  private let stateLock = NSLock()
  private var stopped = false
  /// The inner session's task. (Not `task`: URLProtocol has one already.)
  private var loadTask: URLSessionDataTask?

  /// URL loading calls `startLoading` on a thread whose run loop expects
  /// client callbacks back on it.
  private var clientThread: Thread?
  private var clientModes: [String] = [RunLoop.Mode.default.rawValue]

  override class func canInit(with request: URLRequest) -> Bool {
    guard let url = request.url,
      url.scheme?.lowercased() == "https",
      let host = url.host?.lowercased()
    else {
      return false
    }
    return host == throttledHost
  }

  override class func canonicalRequest(for request: URLRequest) -> URLRequest {
    request
  }

  override func startLoading() {
    clientThread = Thread.current
    if let mode = RunLoop.current.currentMode, mode != .default {
      clientModes = [RunLoop.Mode.default.rawValue, mode.rawValue]
    }
    Self.gate.admit(self)
  }

  override func stopLoading() {
    stateLock.lock()
    stopped = true
    let running = loadTask
    stateLock.unlock()

    // Still queued: drop it; it never took a slot. Otherwise cancel it; its
    // completion gives the slot back.
    if !Self.gate.withdraw(self) {
      running?.cancel()
    }
  }

  /// Called by the gate once this request holds a slot. Every call is
  /// matched by exactly one `gate.release()`.
  fileprivate func run() {
    stateLock.lock()
    if stopped {
      stateLock.unlock()
      Self.gate.release()
      return
    }
    let dataTask = Self.session.dataTask(with: request) { [weak self] data, response, error in
      Self.gate.release()
      self?.deliver(data: data, response: response, error: error)
    }
    loadTask = dataTask
    stateLock.unlock()
    dataTask.resume()
  }

  private func deliver(data: Data?, response: URLResponse?, error: Error?) {
    onClientThread { [weak self] in
      guard let self else { return }
      self.stateLock.lock()
      let stopped = self.stopped
      self.stateLock.unlock()
      // No client calls after stopLoading.
      guard !stopped, let client = self.client else { return }

      if let error {
        client.urlProtocol(self, didFailWithError: error)
        return
      }
      if let response {
        client.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
      }
      if let data, !data.isEmpty {
        client.urlProtocol(self, didLoad: data)
      }
      client.urlProtocolDidFinishLoading(self)
    }
  }

  private func onClientThread(_ block: @escaping () -> Void) {
    guard let thread = clientThread else {
      block()
      return
    }
    perform(
      #selector(runClientBlock(_:)),
      on: thread,
      with: ClientBlock(block),
      waitUntilDone: false,
      modes: clientModes
    )
  }

  @objc private func runClientBlock(_ block: ClientBlock) {
    block.run()
  }
}

/// A closure that can travel through `perform(_:on:with:...)`.
private final class ClientBlock: NSObject {
  let run: () -> Void

  init(_ run: @escaping () -> Void) {
    self.run = run
  }
}

/// Counts slots and queues requests first come, first served.
private final class RequestGate {
  private let limit: Int
  private let lock = NSLock()
  private var running = 0
  private var waiting: [MapRequestThrottle] = []

  init(limit: Int) {
    self.limit = limit
  }

  /// Runs `request` now if a slot is free, else queues it.
  func admit(_ request: MapRequestThrottle) {
    lock.lock()
    guard running < limit else {
      waiting.append(request)
      lock.unlock()
      return
    }
    running += 1
    lock.unlock()
    request.run()
  }

  /// A running request finished, however it ended: its slot passes to the
  /// next queued request, or frees up.
  func release() {
    lock.lock()
    guard !waiting.isEmpty else {
      running -= 1
      lock.unlock()
      return
    }
    let next = waiting.removeFirst()
    lock.unlock()
    next.run()
  }

  /// Removes `request` if it's still queued; false once it has a slot.
  func withdraw(_ request: MapRequestThrottle) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    guard let index = waiting.firstIndex(where: { $0 === request }) else {
      return false
    }
    waiting.remove(at: index)
    return true
  }
}
