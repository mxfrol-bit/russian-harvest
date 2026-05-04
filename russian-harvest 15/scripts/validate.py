#!/usr/bin/env python3
"""
Validate the built site: check all HTML files are well-formed,
internal links point to existing files, and key elements are present.

Run: python3 scripts/validate.py
"""
import os
import re
import sys
from pathlib import Path

SITE = Path(__file__).parent.parent / 'site'

REQUIRED_PAGES = [
    'index.html', 'catalog.html', 'product.html', 'sale.html',
    'about.html', 'how.html', 'contacts.html', 'account.html',
    'auction.html', 'prices.html',
    'offer.html', 'regulations.html', 'policy.html', 'dispute.html',
    '404.html',
]

REQUIRED_ASSETS = [
    'assets/css/main.css',
    'assets/js/config.js',
    'assets/js/api.js',
    'assets/js/main.js',
]


def main():
    errors = []
    warnings = []

    # 1. Check all pages exist
    for page in REQUIRED_PAGES:
        p = SITE / page
        if not p.exists():
            errors.append(f"MISSING: {page}")
            continue
        content = p.read_text(encoding='utf-8')
        # Basic HTML checks
        if '</html>' not in content:
            errors.append(f"{page}: missing </html>")
        if '</body>' not in content:
            errors.append(f"{page}: missing </body>")
        # Required scripts present
        if 'config.js' not in content:
            warnings.append(f"{page}: config.js not included")
        if 'api.js' not in content:
            warnings.append(f"{page}: api.js not included")

    # 2. Check assets
    for asset in REQUIRED_ASSETS:
        if not (SITE / asset).exists():
            errors.append(f"MISSING ASSET: {asset}")

    # 3. Check internal links resolve
    link_pattern = re.compile(r'href="([^"#][^"]*?\.html)"')
    for page in REQUIRED_PAGES:
        p = SITE / page
        if not p.exists():
            continue
        content = p.read_text(encoding='utf-8')
        for match in link_pattern.findall(content):
            # Skip external / relative-to-current
            if match.startswith('http'):
                continue
            target = SITE / match.lstrip('/')
            if not target.exists():
                warnings.append(f"{page}: broken link → {match}")

    # 4. Check card count on catalog and sale
    catalog = (SITE / 'catalog.html').read_text(encoding='utf-8')
    cards = len(re.findall(r'class="card[^"]*"\s+data-offer', catalog))
    if cards < 30:
        warnings.append(f"catalog.html: only {cards} offer cards (expected 30+)")

    # Report
    print(f"\n{'='*50}\nVALIDATION REPORT\n{'='*50}\n")
    if errors:
        print("❌ ERRORS:")
        for e in errors:
            print(f"   - {e}")
    if warnings:
        print("\n⚠️  WARNINGS:")
        for w in warnings:
            print(f"   - {w}")
    if not errors and not warnings:
        print("✅ All checks passed. Site is ready to deploy.")
    elif not errors:
        print("\n✅ No errors — build OK with warnings above.")

    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
