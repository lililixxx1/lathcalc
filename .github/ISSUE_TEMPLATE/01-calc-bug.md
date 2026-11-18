name: 🧮 计算结果不对
about: 算出来的数和手册/实际加工对不上
title: '[计算有误] '
labels: ['calc-bug']
body:
  - type: input
    id: page
    attributes:
      label: 哪个页面 / 功能
      placeholder: 如：螺纹 · G76 程序（p04）
    validations:
      required: true
  - type: textarea
    id: input
    attributes:
      label: 我输入了什么
      placeholder: 如：M30×3.5，FANUC，两行式
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: 期望结果（手册/师傅给的数）
      placeholder: 附出处更好：标准号、手册页、机床实际
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: App 给出的结果
    validations:
      required: true
