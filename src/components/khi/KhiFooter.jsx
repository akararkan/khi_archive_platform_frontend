import React from 'react'
import { Link } from 'react-router-dom'

import { KhiLogo } from '@/components/brand/KhiLogo'
import { UI } from './khi-data'

export default function KhiFooter() {
  return (
    <footer className="footer">
      <div className="foot-wrap">
        <div className="foot-brand">
          <KhiLogo className="mark" />
          <b>{UI.org}</b>
          <div className="tg">گەنجینەی زیندووی یادەوەری گەلێک</div>
          <p>
            لە ساڵی ١٩٩٨ـەوە، پاراستن و دەستپێگەیشتنی ئازاد بۆ یادەوەریی زارەکی،
            مۆسیقایی، نووسراو و وێنەیی کوردستان.
          </p>
        </div>

        <div className="foot-col">
          <h5>گەڕان</h5>
          <Link to="/public/browse?types=audio">تۆمارە دەنگییەکان</Link>
          <Link to="/public/browse?types=video">ڤیدیۆ و فیلم</Link>
          <Link to="/public/browse?types=text">دەستنووسەکان</Link>
          <Link to="/public/browse?types=image">وێنەکان</Link>
          <Link to="/public/browse?type=person">پێرستی کەسەکان</Link>
        </div>

        <div className="foot-col">
          <h5>دەزگاکە</h5>
          <Link to="/public/browse?type=project">پڕۆژەکان</Link>
          <Link to="/public/browse?type=category">پۆلەکان</Link>
          <Link to="/public/browse?type=all">هەموو کۆکراوەکان</Link>
        </div>

        <div className="foot-col">
          <h5>دەستپێگەیشتنی ئازاد</h5>
          <span>بەکارهێنان و مۆڵەت</span>
          <span>ڕێنمایی سەرچاوەپێدان</span>
          <span>دەستپێگەیشتن</span>
        </div>
      </div>

      <div className="foot-bottom">
        <span>© ٢٠٢٦ {UI.org} — هەموو کۆکراوەکان دەستپێگەیشتنی ئازادن</span>
        <span>سلێمانی · هەرێمی کوردستان</span>
      </div>
    </footer>
  )
}
