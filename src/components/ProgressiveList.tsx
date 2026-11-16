import React, { memo, ReactNode } from 'react';

type ProgressiveListRowProps<T> = {
  item: T;
  index: number;
  isLast: boolean;
  state: unknown;
  renderItem: (
    item: T,
    index: number,
    isLast: boolean,
    state: unknown,
  ) => ReactNode;
};

function ProgressiveListRowInner<T>({
  item,
  index,
  isLast,
  state,
  renderItem,
}: ProgressiveListRowProps<T>) {
  return renderItem(item, index, isLast, state);
}

const MemoizedProgressiveListRow = memo(
  ProgressiveListRowInner,
) as typeof ProgressiveListRowInner;

type ProgressiveListProps<T extends { id: string }> = {
  items: readonly T[];
  renderItem: (
    item: T,
    index: number,
    isLast: boolean,
    state: unknown,
  ) => ReactNode;
  rowStates?: readonly unknown[];
};

export default function ProgressiveList<T extends { id: string }>({
  items,
  renderItem,
  rowStates,
}: ProgressiveListProps<T>) {
  return (
    <>
      {items.map((item, index) => (
        <MemoizedProgressiveListRow
          key={item.id || index}
          item={item}
          index={index}
          isLast={index === items.length - 1}
          state={rowStates?.[index]}
          renderItem={renderItem}
        />
      ))}
    </>
  );
}
