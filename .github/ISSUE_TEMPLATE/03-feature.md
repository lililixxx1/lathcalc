name: 💡 想要的功能
about: 缺什么工具/图形/工况，或哪里不顺手
title: '[功能建议] '
labels: ['enhancement']
body:
  - type: textarea
    id: scenario
    attributes:
      label: 你的场景（做什么活时需要它）
      placeholder: 如：车 55° 密封管螺纹时想直接看基面位置
    validations:
      required: true
  - type: textarea
    id: wish
    attributes:
      label: 希望 App 怎么做
    validations:
      required: false
