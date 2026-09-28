export const CATEGORIES = [
  { key: 'clothes', label: 'Clothes', color: 'var(--color-cat-clothes)' },
  { key: 'blankets', label: 'Blankets', color: 'var(--color-cat-blankets)' },
  { key: 'stationery', label: 'Stationery', color: 'var(--color-cat-stationery)' },
  { key: 'books', label: 'Books', color: 'var(--color-cat-books)' },
  { key: 'other', label: 'Other', color: 'var(--color-cat-other)' },
]

export const categoryLabel = (key) => CATEGORIES.find((c) => c.key === key)?.label ?? key
