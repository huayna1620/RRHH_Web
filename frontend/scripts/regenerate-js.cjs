const esbuild = require('esbuild');

const files = [
  'src/app/layouts/AppLayout.tsx',
  'src/components/forms/FormField.tsx',
  'src/components/ui/button.tsx',
  'src/components/ui/input.tsx',
  'src/components/ui/select.tsx',
  'src/components/ui/textarea.tsx',
  'src/components/ui/pagination.tsx',
  'src/components/shared/BarraSuperior.tsx',
  'src/components/charts/AttendanceBarChart.tsx',
  'src/modules/dashboard/pages/DashboardPage.tsx',
  'src/modules/dashboard/pages/PaginaDashboard.tsx',
  'src/modules/analytics/pages/AnalyticsPage.tsx',
  'src/modules/analytics/pages/PaginaAnalitica.tsx',
  'src/modules/users/pages/UsersPage.tsx',
  'src/modules/users/pages/PaginaUsuarios.tsx',
  'src/modules/roles/pages/RolesPage.tsx'
  ,
  'src/modules/roles/pages/PaginaRoles.tsx',
  'src/modules/employees/pages/EmployeesPage.tsx',
  'src/modules/employees/pages/PaginaEmpleados.tsx',
  'src/modules/org-structure/pages/OrgStructurePage.tsx',
  'src/modules/org-structure/pages/PaginaEstructuraOrg.tsx'
];

(async () => {
  for (const file of files) {
    const out = file.replace(/\.tsx$/, '.js');
    await esbuild.build({
      entryPoints: [file],
      outfile: out,
      bundle: false,
      format: 'esm',
      platform: 'browser',
      jsx: 'automatic',
      target: ['es2020'],
      sourcemap: false,
      logLevel: 'silent',
      tsconfig: 'tsconfig.app.json'
    });
    console.log(`generated ${out}`);
  }
})();
