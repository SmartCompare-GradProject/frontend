const fs = require('fs');

const targetPath = './src/environments/environment.prod.ts';
const envConfigFile = `export const environment = {
  production: true,
  apiUrl: '${process.env.BACKEND_URL || 'https://smartcompare-backend-production-527d.up.railway.app'}',
  useMockAdminApi: false,
};
`;

fs.writeFileSync(targetPath, envConfigFile);
console.log('Environment variables set for production build.');
