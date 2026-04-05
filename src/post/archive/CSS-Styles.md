---
title: "CSS Styles"
categories: [Code, CSS]
---


# 1. HTML
## `[style=""]` inline css 
```html
<div style="">

</div>
```

## `head>style` css
```html
<head>
  <style>
    /* ... */
  </style>
</head>
```

## `head>link[rel="stylesheet"]` href="xxx.css"
```html
<head>
  <link rel="stylesheet" href="style.css">
</head>
```

# 2. Framework (React, Vue)
## import 'xxx.css' (jsx)
```jsx
import './styles.css';
```
## style tag (vue)
```vue
<style>
/* ... */
</style>
```

# 3. Libraries
- component classes style (bootstrap style)
- atomic css style (tailwind)
- css-in-js style (emotion)
```jsx
import { css } from '@emotion/react'

const color = 'white'

render(
  <div
    css={css`
      padding: 32px;
      background-color: hotpink;
      font-size: 24px;
      border-radius: 4px;
      &:hover {
        color: ${color};
      }
    `}
  >
    Hover to change color.
  </div>
)
```

