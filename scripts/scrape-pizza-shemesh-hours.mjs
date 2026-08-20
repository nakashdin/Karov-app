/**
 * Scrapes opening hours for Pizza Shemesh branches that are missing them.
 * Output: pizza-shemesh-hours.json
 */
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Map: DB id → branch page URL slug
const BRANCHES = [
  // OSM entry missing hours
  { id: 'osm-node-2079186344', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a7%d7%a8%d7%99%d7%99%d7%aa-%d7%90%d7%95%d7%a0%d7%95-%d7%a8%d7%97%d7%95%d7%91-%d7%99%d7%a2%d7%a7%d7%91-%d7%93%d7%95%d7%a8%d7%99-7/' },
  // Manual entries 9000000-9000059
  { id: '9000000', url: 'https://pizza-shemesh.co.il/%d7%90%d7%95%d7%a4%d7%a7%d7%99%d7%9d/' },
  { id: '9000001', url: 'https://pizza-shemesh.co.il/%d7%94%d7%a8%d7%a6%d7%9c%d7%99%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%a1%d7%95%d7%a7%d7%95%d7%9c%d7%95%d7%91-31/' },
  { id: '9000002', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%95%d7%a8-%d7%99%d7%94%d7%95%d7%93%d7%94-%d7%90%d7%a8%d7%91%d7%9c-13/' },
  { id: '9000003', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%95%d7%a8-%d7%99%d7%94%d7%95%d7%93%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%91%d7%9f-%d7%a4%d7%95%d7%a8%d7%aa-79/' },
  { id: '9000004', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%96%d7%95%d7%a8-%d7%a8%d7%97%d7%95%d7%91-%d7%a9%d7%a4%d7%99%d7%a0%d7%95%d7%96%d7%94-2/' },
  { id: '9000005', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%99%d7%9c%d7%aa-%d7%a8%d7%97%d7%95%d7%91-%d7%94%d7%aa%d7%9e%d7%a8%d7%99%d7%9d-39/' },
  { id: '9000006', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%9c%d7%a2%d7%93-%d7%a8%d7%97%d7%95%d7%91-%d7%a8%d7%91%d7%99-%d7%99%d7%94%d7%95%d7%93%d7%94-%d7%94%d7%a0%d7%a9%d7%99%d7%90-94/' },
  { id: '9000007', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%a4%d7%a8%d7%aa-%d7%a8%d7%97%d7%95%d7%91-%d7%90%d7%a4%d7%a8%d7%aa-%d7%a1%d7%a0%d7%98%d7%a8/' },
  { id: '9000008', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%a9%d7%93%d7%95%d7%93-%d7%a8%d7%97%d7%95%d7%91-%d7%93%d7%91-%d7%92%d7%95%d7%a8-11/' },
  { id: '9000009', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%a9%d7%93%d7%95%d7%93-%d7%a8%d7%97%d7%95%d7%91-%d7%a8%d7%95%d7%92%d7%96%d7%99%d7%9f-3/' },
  { id: '9000010', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%a9%d7%a7%d7%9c%d7%95%d7%9f-%d7%a8%d7%97%d7%95%d7%91-%d7%91%d7%99%d7%90%d7%9c%d7%99%d7%a7-36/' },
  { id: '9000011', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%a9%d7%a7%d7%9c%d7%95%d7%9f-%d7%a8%d7%97%d7%95%d7%91-%d7%91%d7%a7%d7%a2%d7%aa-%d7%94%d7%a8%d7%99%d7%9e%d7%95%d7%9f-3/' },
  { id: '9000012', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%90%d7%a9%d7%a7%d7%9c%d7%95%d7%9f-%d7%a2%d7%99%d7%a8-%d7%94%d7%99%d7%99%d7%9f/' },
  { id: '9000013', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%90%d7%a8-%d7%99%d7%a2%d7%a7%d7%91/' },
  { id: '9000014', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%90%d7%a8-%d7%a9%d7%91%d7%a2-%d7%a8%d7%97%d7%95%d7%91-%d7%a0%d7%97%d7%9c-%d7%a4%d7%a8%d7%aa-20/' },
  { id: '9000015', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%90%d7%a8-%d7%a9%d7%91%d7%a2-%d7%9e%d7%aa%d7%97%d7%9d-%d7%94%d7%91%d7%9c%d7%95%d7%a7/' },
  { id: '9000016', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%90%d7%a8-%d7%a9%d7%91%d7%a2-%d7%a8%d7%97%d7%95%d7%91-%d7%99%d7%95%d7%94%d7%a0%d7%94-%d7%96%d7%91%d7%95%d7%98%d7%99%d7%a0%d7%a1%d7%a7%d7%99-24/' },
  { id: '9000017', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%90%d7%a8-%d7%a9%d7%91%d7%a2-%d7%a8%d7%97%d7%95%d7%91-%d7%9e%d7%a8%d7%9b%d7%96-%d7%90%d7%95%d7%a8%d7%9f-185/' },
  { id: '9000018', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%99%d7%aa-%d7%a9%d7%9e%d7%a9-%d7%a8%d7%97%d7%95%d7%91-%d7%a8%d7%91%d7%99%d7%9f-15/' },
  { id: '9000019', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%99%d7%aa-%d7%a9%d7%9e%d7%a9-%d7%a8%d7%97%d7%95%d7%91-%d7%99%d7%97%d7%96%d7%a7%d7%90%d7%9c-%d7%94%d7%a0%d7%91%d7%99%d7%90-22/' },
  { id: '9000020', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%99%d7%aa-%d7%a9%d7%9e%d7%a9-%d7%a8%d7%9e%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%94%d7%90%d7%9e%d7%95%d7%a8%d7%90%d7%99%d7%9d-35/' },
  { id: '9000021', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%99%d7%aa%d7%a8-%d7%a2%d7%99%d7%9c%d7%99%d7%aa-%d7%a8%d7%97%d7%95%d7%91-%d7%94%d7%a8%d7%91-%d7%91%d7%a8%d7%99%d7%9d-4/' },
  { id: '9000022', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%a0%d7%99-%d7%91%d7%a8%d7%a7-%d7%a8%d7%97%d7%95%d7%91-%d7%96%d7%91%d7%95%d7%98%d7%99%d7%a0%d7%a1%d7%a7%d7%99-120/' },
  { id: '9000023', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%a0%d7%99-%d7%91%d7%a8%d7%a7-%d7%a8%d7%97%d7%95%d7%91-%d7%99%d7%a6%d7%97%d7%a7-%d7%9e%d7%90%d7%99%d7%a8-%d7%94%d7%9b%d7%94%d7%9f-4/' },
  { id: '9000024', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%a0%d7%99-%d7%91%d7%a8%d7%a7-%d7%a8%d7%97%d7%95%d7%91-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-18/' },
  { id: '9000025', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%a0%d7%99-%d7%91%d7%a8%d7%a7-%d7%a8%d7%97%d7%95%d7%91-%d7%9b%d7%94%d7%a0%d7%9e%d7%9f-104/' },
  { id: '9000026', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%a0%d7%99-%d7%91%d7%a8%d7%a7-%d7%a8%d7%97%d7%95%d7%91-%d7%a8%d7%91%d7%99-%d7%a2%d7%a7%d7%99%d7%91%d7%90/' },
  { id: '9000027', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%aa-%d7%99%d7%9d-%d7%90%d7%9c%d7%99-%d7%9b%d7%94%d7%9f-25/' },
  { id: '9000028', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%aa-%d7%99%d7%9d-%d7%99%d7%95%d7%97%d7%a0%d7%9f-%d7%94%d7%a1%d7%a0%d7%93%d7%9c%d7%a8-4/' },
  { id: '9000029', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%91%d7%aa-%d7%99%d7%9d-%d7%a8%d7%97%d7%95%d7%91-%d7%a2%d7%95%d7%96%d7%99%d7%90%d7%9c-25/' },
  { id: '9000030', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%92%d7%91%d7%a2%d7%aa%d7%99%d7%99%d7%9d-%d7%a8%d7%97%d7%95%d7%91-%d7%95%d7%99%d7%a6%d7%9e%d7%9f-43/' },
  { id: '9000031', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%92%d7%93%d7%a8%d7%94/' },
  { id: '9000032', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%92%d7%9f-%d7%99%d7%91%d7%a0%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%a6%d7%94%d7%9c-28/' },
  { id: '9000033', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%92%d7%a0%d7%99-%d7%aa%d7%a7%d7%95%d7%95%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%a2%d7%99%d7%9f-%d7%92%d7%a0%d7%99%d7%9d-7/' },
  { id: '9000034', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%93%d7%99%d7%9e%d7%95%d7%a0%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%93-%d7%94%d7%9e%d7%a2%d7%a4%d7%99%d7%9c%d7%99%d7%9d-215/' },
  { id: '9000035', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%97%d7%93%d7%a8%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%94%d7%a0%d7%a9%d7%99%d7%90-59/' },
  { id: '9000036', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%97%d7%95%d7%9c%d7%95%d7%9f-%d7%a8%d7%97%d7%95%d7%91-%d7%92%d7%95%d7%9c%d7%93%d7%94-%d7%9e%d7%90%d7%99%d7%a8-8/' },
  { id: '9000037', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%97%d7%95%d7%9c%d7%95%d7%9f-%d7%a8%d7%97%d7%95%d7%91-%d7%93%d7%91-%d7%94%d7%95%d7%96-63/' },
  { id: '9000038', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%97%d7%95%d7%9c%d7%95%d7%9f-%d7%a8%d7%97%d7%95%d7%91-%d7%94%d7%a8-%d7%94%d7%a6%d7%95%d7%a4%d7%99%d7%9d-42/' },
  { id: '9000039', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%97%d7%99%d7%a4%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%92%d7%90%d7%95%d7%9c%d7%94-31-2/' },
  { id: '9000040', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%97%d7%a8%d7%99%d7%a9-%d7%a8%d7%97%d7%95%d7%91-%d7%93%d7%a8%d7%9a-%d7%90%d7%a8%d7%a5-41/' },
  { id: '9000041', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%91%d7%a0%d7%94-%d7%90%d7%92%d7%95%d7%96-2/' },
  { id: '9000042', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%94%d7%95%d7%93-%d7%a8%d7%97%d7%95%d7%91-%d7%95%d7%99%d7%a6%d7%9e%d7%9f-44/' },
  { id: '9000043', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-%d7%91%d7%99%d7%aa-%d7%95%d7%92%d7%9f-%d7%94%d7%a4%d7%99%d7%a1%d7%92%d7%94-45/' },
  { id: '9000044', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-%d7%92%d7%90%d7%95%d7%9c%d7%94/' },
  { id: '9000045', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-%d7%9e%d7%91%d7%a9%d7%a8%d7%aa-%d7%a6%d7%99%d7%95%d7%9f/' },
  { id: '9000046', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-%d7%a8%d7%97%d7%95%d7%91-%d7%9e%d7%a9%d7%94-%d7%93%d7%99%d7%99%d7%9f-164/' },
  { id: '9000047', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-%d7%a8%d7%97%d7%95%d7%91-%d7%90%d7%92%d7%a8%d7%99%d7%a4%d7%a1-42/' },
  { id: '9000048', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%99%d7%a8%d7%95%d7%a9%d7%9c%d7%99%d7%9d-%d7%a8%d7%97%d7%95%d7%91-%d7%92%d7%95%d7%9c%d7%93%d7%94-%d7%9e%d7%90%d7%99%d7%a8-255/' },
  { id: '9000049', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%9b%d7%a4%d7%a8-%d7%97%d7%91%d7%93-%d7%a8%d7%97%d7%95%d7%91-%d7%90%d7%93%d7%9e%d7%95%d7%a8-%d7%94%d7%a8%d7%97%d7%91-1/' },
  { id: '9000050', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%9b%d7%a4%d7%a8-%d7%a1%d7%91%d7%90/' },
  { id: '9000051', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%9c%d7%95%d7%93-%d7%a8%d7%97%d7%95%d7%91-%d7%91%d7%9f-%d7%92%d7%95%d7%a8%d7%99%d7%95%d7%9f-5/' },
  { id: '9000052', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%9e%d7%95%d7%93%d7%99%d7%a2%d7%99%d7%9f-%d7%9e%d7%95%d7%a8%d7%a9%d7%aa/' },
  { id: '9000053', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%9e%d7%95%d7%93%d7%99%d7%a2%d7%99%d7%9f-%d7%a2%d7%99%d7%9c%d7%99%d7%aa-%d7%a8%d7%97%d7%95%d7%91-%d7%90%d7%91%d7%a0%d7%99-%d7%96%d7%a8-46/' },
  { id: '9000054', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%9e%d7%a6%d7%a4%d7%94-%d7%a8%d7%9e%d7%95%d7%9f-%d7%91%d7%a7%d7%a8%d7%95%d7%91-%d7%94%d7%a4%d7%aa%d7%99%d7%97%d7%94/' },
  { id: '9000055', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a0%d7%a1-%d7%a6%d7%99%d7%95%d7%a0%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%a0%d7%95%d7%a8%d7%93%d7%90%d7%95-6/' },
  { id: '9000056', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a0%d7%aa%d7%99%d7%91%d7%95%d7%aa-%d7%a8%d7%97%d7%95%d7%91-%d7%99%d7%95%d7%a1%d7%a3-%d7%a1%d7%9e%d7%99%d7%9c%d7%95-113/' },
  { id: '9000057', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a0%d7%aa%d7%a0%d7%99%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%94%d7%a8%d7%a6%d7%9c-51/' },
  { id: '9000058', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a2%d7%a4%d7%95%d7%9c%d7%94-%d7%a8%d7%97%d7%95%d7%91-%d7%9e%d7%a9%d7%94-%d7%a9%d7%a8%d7%aa-3/' },
  { id: '9000059', url: 'https://pizza-shemesh.co.il/%d7%a1%d7%a0%d7%99%d7%a3-%d7%a2%d7%a8%d7%93-%d7%a8%d7%97%d7%95%d7%91-%d7%90-%d7%91%d7%9f-%d7%99%d7%90%d7%99%d7%a8-35/' },
];

function parseHoursFromHtml(html) {
  // Find "שעות פעילות" then extract the first icon-list paragraph after it
  const idx = html.indexOf('שעות פעילות');
  if (idx === -1) return null;
  const section = html.slice(idx, idx + 4000);
  // Extract content of <p> inside elementor-icon-list-text
  const pMatch = section.match(/<span[^>]*elementor-icon-list-text[^>]*>\s*<p>([\s\S]*?)<\/p>/);
  if (!pMatch) {
    // Fallback: look for the text directly inside the span
    const spanMatch = section.match(/elementor-icon-list-text[^>]*>([\s\S]*?)<\/span>/);
    if (spanMatch) return cleanHours(spanMatch[1]);
    return null;
  }
  return cleanHours(pMatch[1]);
}

function cleanHours(raw) {
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&ndash;/g, '–')
    .replace(/&#8211;/g, '–')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join(' | ');
}

async function fetchHours(id, url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return { id, url, error: `HTTP ${res.status}` };
    const html = await res.text();
    const hours = parseHoursFromHtml(html);
    return { id, url, hours };
  } catch (e) {
    return { id, url, error: e.message };
  }
}

console.log(`Scraping ${BRANCHES.length} branches...`);
const results = [];
for (let i = 0; i < BRANCHES.length; i++) {
  const b = BRANCHES[i];
  const result = await fetchHours(b.id, b.url);
  results.push(result);
  const status = result.error ? `ERROR: ${result.error}` : (result.hours ? result.hours.slice(0, 60) : 'NO-HOURS');
  console.log(`[${i + 1}/${BRANCHES.length}] ${b.id}: ${status}`);
  // Small delay to be polite
  await new Promise(r => setTimeout(r, 300));
}

const outPath = path.join(__dirname, 'pizza-shemesh-hours.json');
writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`\nSaved to ${outPath}`);
console.log(`Success: ${results.filter(r => r.hours).length} | Errors: ${results.filter(r => r.error).length} | No-hours: ${results.filter(r => !r.hours && !r.error).length}`);
