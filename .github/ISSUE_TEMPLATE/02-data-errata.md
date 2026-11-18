name: 📊 数据勘误
about: 尺寸表/公差表/密度/底孔钻头等数据与标准不符
title: '[数据勘误] '
labels: ['data-errata']
body:
  - type: input
    id: table
    attributes:
      label: 哪张表
      placeholder: 如：攻丝底孔钻头表 M10
    validations:
      required: true
  - type: textarea
    id: current
    attributes:
      label: App 现在显示的值
    validations:
      required: true
  - type: textarea
    id: correct
    attributes:
      label: 正确值 + 出处（标准号/版本/页码）
      description: 数据修正走双源核对，务必给出可查的出处
    validations:
      required: true
