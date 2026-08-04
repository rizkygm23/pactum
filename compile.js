const fs = require('fs');
const path = require('path');
const solc = require('solc');

const contractPath = path.resolve(__dirname, 'contracts', 'PactumBilling.sol');
const source = fs.readFileSync(contractPath, 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'PactumBilling.sol': {
      content: source,
    },
  },
  settings: {
    evmVersion: 'paris',
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object'],
      },
    },
  },
};

console.log('Compiling PactumBilling.sol...');
const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  output.errors.forEach((err) => {
    console.error(err.formattedMessage);
  });
  if (output.errors.some((err) => err.severity === 'error')) {
    process.exit(1);
  }
}

const contract = output.contracts['PactumBilling.sol']['PactumBilling'];

const dir = path.resolve(__dirname, 'artifacts-contract');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir);
}

fs.writeFileSync(
  path.join(dir, 'PactumBilling.json'),
  JSON.stringify({
    abi: contract.abi,
    bytecode: contract.evm.bytecode.object,
  }, null, 2)
);

console.log('Compilation successful. ABI and Bytecode saved to artifacts-contract/PactumBilling.json');
