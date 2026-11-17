import sys
import asyncio
import json

sys.path.append('.')
from app.main import get_predictions, get_daily_banker_slip

async def rebuild():
    print("Fetching and recalculating all live fixtures with 20-Site Consensus & Corners...")
    preds = await get_predictions(force_refresh=True)
    slip = await get_daily_banker_slip(legs=3)
    data = {
        'predictions': preds.get('predictions', []),
        'daily_banker_slip': slip,
        'source': preds.get('source', '')
    }
    
    js_str = 'window.JUDETIPS_DATA = ' + json.dumps(data, ensure_ascii=False) + '; window.GOALINSIGHT_DATA = window.JUDETIPS_DATA;'
    
    with open('../fixtures_data.js', 'w', encoding='utf-8') as f:
        f.write(js_str)
    with open('../docs/fixtures_data.js', 'w', encoding='utf-8') as f:
        f.write(js_str)
        
    print(f"Successfully generated {len(preds.get('predictions', []))} fixtures with 20-site consensus & corner markets!")
    
    # Check sample match (e.g. Niger vs Morocco)
    for p in preds.get('predictions', []):
        if 'Niger' in p.get('home_team', '') and 'Morocco' in p.get('away_team', ''):
            pred = p.get('prediction', {})
            print(f"Sample Niger vs Morocco: Favored={pred.get('favored_outcome')}, Score={pred.get('most_likely_score')}, Away Win={pred.get('away_win')}")
            break

if __name__ == "__main__":
    asyncio.run(rebuild())
