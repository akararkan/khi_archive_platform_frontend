import React from 'react'
import { UI } from './khi-data'

export default function KhiRibbon() {
  return (
    <div className="ribbon">
      <div className="wrap">
        <div><b>{UI.org}</b></div>
        <div className="right">
          <span>دامەزراوە لە ١٩٩٨ · سلێمانی</span>
          <span>دەستپێگەیشتنی ئازاد</span>
        </div>
      </div>
    </div>
  )
}
