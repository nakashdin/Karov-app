import { readFileSync, writeFileSync } from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';

const DELETE_TLV_DUPS = new Set([
  'osm-node-2862959843','osm-node-6473212377','osm-node-8700929117',
  'osm-node-10176143226','osm-node-10279205409','osm-node-10727399152',
  'osm-node-10812430078','osm-node-10814448811','osm-node-10814448813',
  'osm-node-10814448814','osm-node-10814448820','osm-node-10829518083',
  'osm-node-10829562649','osm-node-11228725732','osm-node-11405068715',
  'osm-node-11607487058','osm-node-11681572591','osm-node-11685020594',
  'osm-node-11749994120','osm-node-11868727704','osm-node-12064685793',
  'osm-node-12078593856','osm-node-12106426945','osm-node-12114477414',
  'osm-node-12140544814','osm-node-12147771610','osm-node-12147904324',
  'osm-node-12187684500','osm-node-12187698113','osm-node-12189931087',
  'osm-node-12281652113','osm-node-12587501531','osm-node-12588050745',
  'osm-node-12588072063','osm-node-12588084718','osm-node-12588118386',
  'osm-node-12588119989','osm-node-12588129401','osm-node-12668721404',
  'osm-node-12668725563','osm-node-12695181881','osm-node-12695193131',
  'osm-node-12737103897','osm-node-12802945060','osm-node-12943579300',
  'osm-node-12946471285','osm-node-13137796250','osm-node-13338979218',
  'osm-node-13371581520','osm-node-13809202206',
]);

const raw = readFileSync(DATA_PATH, 'utf8').replace(/^\uFEFF/, '');
const data = JSON.parse(raw);
const before = data.length;
const cleaned = data.filter(p => !DELETE_TLV_DUPS.has(p.id));
writeFileSync(DATA_PATH, JSON.stringify(cleaned, null, 2));

const tlvOsmLeft = cleaned.filter(p => p.id.startsWith('osm-node-') && p.cityId === 'תל אביב');
console.log('Deleted OSM dups:', before - cleaned.length);
console.log('Total in DB:', cleaned.length);
console.log('TLV OSM remaining:', tlvOsmLeft.length);
tlvOsmLeft.forEach(p => console.log(' ', p.id, '|', p.name, '| type:', p.type));