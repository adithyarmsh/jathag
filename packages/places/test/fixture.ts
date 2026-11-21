// A tiny made-up set of GeoNames files (same layout as the real dumps) for the build tests.
import { deflateRawSync } from 'node:zlib';

/** Minimal .zip writer (one entry, deflate). CRC is left 0: the build's reader does not check it. */
function zip(name: string, content: string): Buffer {
  const data = deflateRawSync(Buffer.from(content, 'utf8'));
  const nameBuf = Buffer.from(name, 'utf8');
  const size = Buffer.byteLength(content, 'utf8');
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(size, 22);
  local.writeUInt16LE(nameBuf.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(size, 24);
  central.writeUInt16LE(nameBuf.length, 28);
  central.writeUInt32LE(0, 42);
  const cdOffset = local.length + nameBuf.length + data.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + nameBuf.length, 12);
  end.writeUInt32LE(cdOffset, 16);
  return Buffer.concat([local, nameBuf, data, central, nameBuf, end]);
}

// geonameid name asciiname alternatenames lat lon class code cc cc2 admin1 admin2 admin3 admin4 pop elev dem tz moddate
const row = (f: (string | number)[]) => f.join('\t');
const IN_ROWS = [
  row([1275339, 'Mumbai', 'Mumbai', 'BOM,Bombay,bmbyy,Bombay - bambai,मुंबई', '19.07283', '72.88261', 'P', 'PPLA', 'IN', '', '16', '', '', '', 12691836, '', 8, 'Asia/Kolkata', '2024-01-01']),
  row([1273862, 'Colāba', 'Colaba', 'Kolaba', '18.90694', '72.81056', 'P', 'PPLX', 'IN', '', '16', '519', '', '', 0, '', 5, 'Asia/Kolkata', '2024-01-01']),
  row([1273861, 'Colāba Point', 'Colaba Point', '', '18.89101', '72.80745', 'T', 'PT', 'IN', '', '16', '519', '', '', 0, '', 0, 'Asia/Kolkata', '2024-01-01']),
];
const C500_ROWS = [
  row([2988507, 'Paris', 'Paris', 'Lutetia,Paname', '48.85341', '2.3488', 'P', 'PPLC', 'FR', '', '11', '75', '751', '75056', 2138551, '', 42, 'Europe/Paris', '2024-01-01']),
  row([1275339, 'Mumbai', 'Mumbai', 'Bombay', '19.07283', '72.88261', 'P', 'PPLA', 'IN', '', '16', '', '', '', 12691836, '', 8, 'Asia/Kolkata', '2024-01-01']),
];

export function makeFixtureFiles(shuffled: boolean): Record<string, Buffer> {
  const order = <T>(a: T[]) => (shuffled ? [...a].reverse() : a);
  return {
    'IN.zip': zip('IN.txt', `${order(IN_ROWS).join('\n')}\n`),
    'cities500.zip': zip('cities500.txt', `${order(C500_ROWS).join('\n')}\n`),
    'admin1CodesASCII.txt': Buffer.from(`${order(['IN.16\tMaharashtra\tMaharashtra\t1264418', 'FR.11\tÎle-de-France\tIle-de-France\t3012874']).join('\n')}\n`),
    'admin2Codes.txt': Buffer.from(`${order(['IN.16.519\tMumbai\tMumbai\t9747998', 'FR.11.75\tParis\tParis\t2968815']).join('\n')}\n`),
    'countryInfo.txt': Buffer.from(`#ISO\tISO3\tISO-Numeric\tfips\tCountry\n${order(['IN\tIND\t356\tIN\tIndia', 'FR\tFRA\t250\tFR\tFrance']).join('\n')}\n`),
  };
}
