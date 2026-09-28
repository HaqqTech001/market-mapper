/**
 * DEV-Only Market Fixtures & Diagnostic GeoJSON
 * 
 * STRICTLY ISOLATED TO DEV / TEST ENVIRONMENTS.
 * Production Market Mapper components must remain 100% market-independent
 * and resolve all geometry dynamically from active assigned missions.
 */

export const DEV_FIXTURE_MARKET = {
  id: 'dev_alaba_fixture',
  name: 'Alaba International Market (DEV Fixture)',
  center: { latitude: 6.4698, longitude: 3.1925 },
  boundary: [
    { latitude: 6.4718, longitude: 3.1895 },
    { latitude: 6.4725, longitude: 3.1955 },
    { latitude: 6.4682, longitude: 3.1968 },
    { latitude: 6.4671, longitude: 3.1908 },
  ],
  assignedSector: [
    { latitude: 6.4708, longitude: 3.1912 },
    { latitude: 6.4712, longitude: 3.1945 },
    { latitude: 6.4690, longitude: 3.1948 },
    { latitude: 6.4686, longitude: 3.1915 },
  ],
  businesses: [
    {
      id: 'biz_01',
      name: 'Solatronics Pure Sine Wave',
      stallNumber: 'Shop 42, Line B',
      activity: 'goods',
      latitude: 6.4699,
      longitude: 3.1928,
    },
    {
      id: 'biz_02',
      name: 'Apex Inverter Repairs & Windings',
      stallNumber: 'Workshop 12, Line A',
      activity: 'services',
      latitude: 6.4703,
      longitude: 3.1934,
    },
    {
      id: 'biz_03',
      name: 'Chukwudi Cable Warehouse',
      stallNumber: 'Warehouse C4',
      activity: 'goods',
      latitude: 6.4692,
      longitude: 3.1921,
    },
  ],
  gates: [
    { id: 'gate_1', name: 'Main Expressway Gate 1', latitude: 6.4719, longitude: 3.1898 },
    { id: 'gate_2', name: 'Electronics Cargo Gate 4', latitude: 6.4684, longitude: 3.1965 },
  ],
};
