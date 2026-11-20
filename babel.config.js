const fs = require('node:fs');
const path = require('node:path');

function readEnvFileValue(key) {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return undefined;
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    .find(value => new RegExp(`^\\s*${key}\\s*=`).test(value));
  if (!line) return undefined;
  let value = line.slice(line.indexOf('=') + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  } else {
    value = value.replace(/\s+#.*$/, '').trim();
  }
  return value || undefined;
}

const configuredApiBaseUrl = process.env.PLAYSPOT_API_BASE_URL || readEnvFileValue('PLAYSPOT_API_BASE_URL');

function inlinePublicApiBaseUrl({ types }) {
  return {
    name: 'playspot-inline-public-api-base-url',
    visitor: {
      MemberExpression(nodePath) {
        const { object, property, computed } = nodePath.node;
        const objectIsProcessEnv = object.type === 'MemberExpression'
          && object.object.type === 'Identifier' && object.object.name === 'process'
          && !object.computed && object.property.type === 'Identifier' && object.property.name === 'env';
        const isApiEnvironmentValue = objectIsProcessEnv
          && (computed ? property.type === 'StringLiteral' && property.value === 'PLAYSPOT_API_BASE_URL'
            : property.type === 'Identifier' && property.name === 'PLAYSPOT_API_BASE_URL');
        if (isApiEnvironmentValue && configuredApiBaseUrl) {
          nodePath.replaceWith(types.stringLiteral(configuredApiBaseUrl.replace(/\/$/, '')));
        }
      },
    },
  };
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [inlinePublicApiBaseUrl],
};
