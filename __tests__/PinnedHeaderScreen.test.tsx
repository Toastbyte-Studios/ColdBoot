import React from 'react';
import { ScrollView, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import PinnedHeaderScreen from '../src/components/PinnedHeaderScreen';

jest.mock('../src/hooks/useFooterClearance', () => ({
  useFooterClearance: () => 120,
}));

describe('PinnedHeaderScreen', () => {
  it('keeps the header out of the scroll view and scrolls only the list', async () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <PinnedHeaderScreen header={<Text>Hero</Text>}>
          <Text>List</Text>
        </PinnedHeaderScreen>,
      );
    });

    const scroll = tree.root.findByType(ScrollView);
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

    const style = tree.root.findByType(ScrollView).props.contentContainerStyle;
    expect(style).toEqual({ paddingBottom: 120 });
  });

  it('lets the header scroll too when it would take most of the screen', async () => {
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
        .findByType(ScrollView)
        .findAllByType(Text)
        .map((node) => node.props.children);

    await ReactTestRenderer.act(async () => {
      withLayout()[0].props.onLayout(layout(600));
      withLayout()[1].props.onLayout(layout(300));
    });
    expect(scrolled()).toEqual(['List']);

    await ReactTestRenderer.act(async () => {
      withLayout()[1].props.onLayout(layout(400));
    });
    expect(scrolled()).toEqual(['Hero', 'List']);
  });
});
