import zipfile
import xml.etree.ElementTree as ET

path = 'C:/Users/leoli/.gemini/antigravity/brain/55440fd0-c1ef-48f1-864c-5b8eb0117ed9/.user_uploaded/media_1790368260790.xlsx'
with zipfile.ZipFile(path, 'r') as z:
    sst = ET.fromstring(z.read('xl/sharedStrings.xml'))
    strings = []
    for si in sst.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
        texts = [t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text]
        strings.append(''.join(texts))
    
    sheet_xml = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    for row in sheet_xml.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        r_num = int(row.attrib.get('r'))
        vals = {}
        for c in row.iter('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            col = ''.join([ch for ch in c.attrib.get('r') if ch.isalpha()])
            v = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = strings[int(v.text)] if v is not None and c.attrib.get('t') == 's' else (v.text if v is not None else '')
            f = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}f')
            formula = f.text if f is not None else None
            vals[col] = (val, formula)
        if r_num <= 10:
            print(f'=== ROW {r_num} ===')
            for col in sorted(vals.keys()):
                v, f = vals[col]
                print(f'  Col {col}: val="{v}"' + (f' (f="{f}")' if f else ''))
