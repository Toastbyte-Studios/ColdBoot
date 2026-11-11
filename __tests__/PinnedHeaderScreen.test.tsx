import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import PinnedHeaderScreen, {
  MIN_LIST_HEIGHT,
} from '../src/components/PinnedHeaderScreen';

jest.mock('../src/hooks/useFooterClearance', () => ({
  useFooterClearance: () => 120,
}));

describe('PinnedHeaderScreen', () => {
  it('keeps the header out of the enabled scroll view and scrolls only the list', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <PinnedHeaderScreen header={<Text>Hero</Text>}>
          <Text>List</Text>
        </PinnedHeaderScreen>,
      );
    });

    const [page, scroll] = tree.root.findAllByType(ScrollView);
    expect(page.props.scrollEnabled).toBe(false);
    expect(scroll.props.scrollEnabled).toBe(true);
    expect(StyleSheet.flatten(page.props.contentContainerStyle)).toEqual({
      flex: 1,
    });
    const inScroll = scroll
      .findAllByType(Text)
      .map((node) => node.props.children);
    expect(inScroll).toEqual(['List']);
    expect(tree.root.findAllByType(Text).map((n) => n.props.children)).toEqual([
      'Hero',
      'List',
    ]);
  });

  it('clears the footer at the end of the list', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <PinnedHeaderScreen header={null}>
          <Text>List</Text>
        </PinnedHeaderScreen>,
      );
    });

    const style =
      tree.root.findAllByType(ScrollView)[1].props.contentContainerStyle;
    expect(style).toEqual({ paddingBottom: 120 });
  });

  it('lets the header scroll too when the list would be left less than its minimum', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <PinnedHeaderScreen header={<Text>Hero</Text>}>
          <Text>List</Text>
        </PinnedHeaderScreen>,
      );
    });
    const layout = (height: number) => ({
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height } },
    });
    // In tree order: the frame, then the header block.
    const withLayout = () =>
      tree.root.findAll(
        (node) =>
          typeof node.type === 'string' &&
          typeof node.props.onLayout === 'function',
      );
    const scrolled = () =>
      tree.root
        .findAllByType(ScrollView)
        .find((node) => node.props.scrollEnabled)!
        .findAllByType(Text)
        .map((node) => node.props.children);

    // 600 frame - 120 footer leaves 480 for the header and the list.
    const tallestPinned = 480 - MIN_LIST_HEIGHT;
    await ReactTestRenderer.act(async () => {
      withLayout()[0].props.onLayout(layout(600));
      withLayout()[1].props.onLayout(layout(tallestPinned));
    });
    expect(scrolled()).toEqual(['List']);

    await ReactTestRenderer.act(async () => {
      withLayout()[1].props.onLayout(layout(tallestPinned + 1));
    });
    expect(scrolled()).toEqual(['Hero', 'List']);
    const [page, list] = tree.root.findAllByType(ScrollView);
    expect(page.props.contentContainerStyle).toBe(false);
    expect(list.props.scrollEnabled).toBe(false);
    expect(StyleSheet.flatten(list.props.style)).toEqual({
      flexGrow: 0,
      flexShrink: 0,
    });
  });

  it('preserves loaded header state across transitions in both directions', async () => {
    const mounted = jest.fn();
    const unmounted = jest.fn();
    function StatefulHeader() {
      const [title, setTitle] = useState('Placeholder');
      useEffect(() => {
        mounted();
        setTitle('Loaded Continue title');
        return unmounted;
      }, []);
      return <Text>{title}</Text>;
    }

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <PinnedHeaderScreen header={<StatefulHeader />}>
          <Text>List</Text>
        </PinnedHeaderScreen>,
      );
    });
    const headerInstance = tree.root.findByType(StatefulHeader);
    const layout = (height: number) => ({
      nativeEvent: { layout: { x: 0, y: 0, width: 375, height } },
    });
    const withLayout = () =>
      tree.root.findAll(
        (node) =>
          typeof node.type === 'string' &&
          typeof node.props.onLayout === 'function',
      );
    await ReactTestRenderer.act(async () => {
      withLayout()[0].props.onLayout(layout(600));
      withLayout()[1].props.onLayout(layout(200));
    });

    for (const [height, pinned] of [
      [400, false],
      [200, true],
      [400, false],
    ] as const) {
      await ReactTestRenderer.act(async () => {
        withLayout()[1].props.onLayout(layout(height));
      });
      const [page, list] = tree.root.findAllByType(ScrollView);
      expect(page.props.scrollEnabled).toBe(!pinned);
      expect(list.props.scrollEnabled).toBe(pinned);
      expect(tree.root.findByType(StatefulHeader)).toBe(headerInstance);
      expect(headerInstance.findByType(Text).props.children).toBe(
        'Loaded Continue title',
      );
      expect(mounted).toHaveBeenCalledTimes(1);
      expect(unmounted).not.toHaveBeenCalled();
    }
    await ReactTestRenderer.act(async () => tree.unmount());
    expect(unmounted).toHaveBeenCalledTimes(1);
  });
});
