import { ModuleRegistry } from 'ag-grid-community';
import { NumberFilterModule, FiltersToolPanelModule } from 'ag-grid-enterprise';

ModuleRegistry.registerModules([NumberFilterModule, FiltersToolPanelModule]);

export const rampenSpalten = [
  { field: 'name', headerName: 'Name' },
  { field: 'startPowerW', headerName: 'Start Power' },
  { field: 'endPowerW', headerName: 'End Power' },
];
