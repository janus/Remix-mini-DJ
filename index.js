if (typeof web3 !== 'undefined') {
  web3 = new Web3(web3.currentProvider)
} else {
  // set the provider you want from Web3.providers
  web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"))
}

let compiler;

let optimize = 1
let compiledContract




window.onload = function() {
     document.getElementById('versions').onchange = loadSolcVersion

     if (!BrowserSolc) {
	console.log('You have to load browser-solc.js in the page. We recommend using a <script> tag.')
        throw new Error()
     }

status('Loading Compiler Versions...')

getAccounts()
BrowserSolc.getVersions(function(soljsonSources, soljsonReleases) {
	populateVersions(soljsonSources)
	setVersion(soljsonReleases['0.4.18'])
	loadSolcVersion()
})

addCompileEvent()
}

function loadSolcVersion() {
	status(`Loading Solc: ${getVersion()}`)
	BrowserSolc.loadVersion(getVersion(), function(c) {
		status('Solc loaded.')
		compiler = c
        })
}

function getVersion() {
	return document.getElementById('versions').value
}

function setVersion(version) {
	document.getElementById('versions').value = version
}

function populateVersions(versions) {
        let sel = document.getElementById('versions')
        sel.innerHTML = ''

	for (let i = 0; i < versions.length; i++) {
		let opt = document.createElement('option')
		opt.appendChild(document.createTextNode(versions[i]))
                opt.value = versions[i]
                sel.appendChild(opt)
                
        }
 }

function status(txt) {
  document.getElementById('status').innerHTML = txt
}

function addCompileEvent() {
  const compileBtn = document.getElementById('contract-compile')
  compileBtn.addEventListener('click', solcCompile)
}

function solcCompile() {
  if (!compiler) return alert('Please select a compiler version.') 

  setCompileButtonState(true)
  status("Compiling contract...")
  compiledContract = compiler.compile(getSourceCode(), optimize)

  if (compiledContract) setCompileButtonState(false)

  //console.log('Compiled Contract :: ==>', compiledContract)
  renderContractList()
  status("Compile Complete.")
}

function getSourceCode() {
  return document.getElementById("source").value
}

function setCompileButtonState(state) {
  document.getElementById("contract-compile").disabled = state
}

function renderContractList() {
  const contractListContainer = document.getElementById('contract-list')
  const { contracts } = compiledContract

  Object.keys(contracts).forEach((contract, index) => {
    const label = `contract-id-${contract}-${Math.random()}`
    const gas = contracts[contract].gasEstimates.creation

    createContractInfo(gas, contract, label, function (el) {
      contractListContainer.appendChild(el)
      const btnContainer = document.getElementById(label)

      btnContainer.appendChild(
        buttonFactory('primary', contract, contracts[contract], 'details')
      )

      btnContainer.appendChild(
        buttonFactory('danger', contract, contracts[contract], 'deploy')
      )
    })
  })
}

function createContractInfo(gas, contractName, label, callback) {
  const el = document.createElement('DIV')

  el.innerHTML = `
    <div class="mui-panel">
      <div id="${label}" class="mui-row">
        <div class="mui-col-md-3">
          Contract Name: <strong>${contractName.substring(1, contractName.length)}</strong>
        </div>
        <div class="mui-col-md-3">
          Gas Estimate: <strong style="color: green;">
            ${sumArrayOfInts(gas)}
          </strong>
        </div>
      </div>
    </div>
  `

  callback(el)
}

function sumArrayOfInts(array) {
  return array.reduce((acc, el) => (acc += el), 0)
}

function buttonFactory(color, contractName, contract, type) {
  const btn = document.createElement('BUTTON')
  const btnContainer = document.createElement('DIV')

  btn.className = `mui-btn mui-btn--small mui-btn--${color} mui-btn--raised"`
  btn.innerText = type
  btn.addEventListener('click', () => type === 'details' 
    ? renderContractDetails(contractName, contract)
    : deployContractEvent(contractName, contract)
  )

  btnContainer.className = 'mui-col-md-3'
  btnContainer.appendChild(btn)

  return btnContainer
}


function renderContractDetails(name, contract) {
  const modalEl = document.createElement('div')
  modalEl.style.width = '700px';
  modalEl.style.margin = '100px auto';
  modalEl.style.padding = '50px';
  modalEl.style.backgroundColor = '#fff';

  modalEl.appendChild(renderContractInfo(name, contract))
  mui.overlay('on', modalEl);
}

function renderContractInfo(contractName, contract) {
  const contractContainer = document.createElement('div')
  contractContainer.innerHTML = `
    <h3>
      Contract Name: <strong>${contractName.substring(1, contractName.length)}</strong>
    </h3>
    <h4>Bytecode:</h4>
    <textarea style="width:670px; height:200px;" readonly>${contract.bytecode}</textarea>
    <h4>ABI:</h4>
    <textarea style="width:670px; height:150px;" readonly>${contract.interface}</textarea>
    <h4>Function Hashes</h4>
    <textarea style="width:670px; height:100px;" readonly>${renderFunctionWithHashes(contract.functionHashes)}</textarea>
    <h4>Opcodes:</h4>
    <textarea style="width:670px; height:200px;" readonly>${contract.opcodes}</textarea>
  `

  return contractContainer
}

function renderFunctionWithHashes(functionHashes) {
  let functionHashContainer = ''

  Object.keys(functionHashes)
    .forEach((functionHash, index) => (
      functionHashContainer += `${++index}. ${functionHashes[functionHash]}: ${functionHash} \n`
    ))

  return functionHashContainer
}


async function getAccount() {
 let rtn = await web3.eth.getAccounts();
 return rtn[0]
}

async function getAccounts() {
   let val = await getAccount()
   renderAccount(val)
}

async function renderAccount(ethAccount) {

  let rtn = await balanceInEth(ethAccount)
  document
    .getElementById('account-addresses')
    .innerHTML = `<div>
        Account: ${ethAccount} 
        <br />
        Balance: ${rtn}
      </div>
    `
}

async function balanceInEth(address) {
 let vl = await web3.eth.getBalance(`${address}`);
 let rtn = web3.utils.fromWei(vl.toString(), 'ether');
 return rtn;
}


async function deployContractEvent(name, contract) {
  const comfirmMsg = `
    Contract: ${name.substring(1)}
    Network: ${currentNetwork()}
    Confirm to deploy with these settings.
  `
  if (!confirm(comfirmMsg)) return
  
  const { bytecode, interface } = contract
  const options = { from: await getAccount(), data: bytecode, gas: 1000000 }
  const newContract = new web3.eth.Contract(JSON.parse(interface), options)
  //console.log(newContract)
  console.log(newContract.options.jsonInterface)

	newContract.deploy({
	    arguments: []
	})
	.send({
	    from: await getAccount(),
	    gas: 1000000,
	    gasPrice: '30000000000000'
	}).on('error', function(error){ console.log(error) })
        
       .on('receipt', function(receipt){
           let fn = newContractCallback(name);
           console.log(receipt)
           fn(receipt)
   //console.log(receipt) // contains the new contract address
})



	//.then(function(newContractInstance){
	 //   console.log(newContractInstance.options.address) // instance with the new contract address
	//});

  //newContractCallback(name)
}

function currentNetwork() {
  const network = web3.eth.getBlock(0).hash
  const main = '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3'
  const test = '0x41941023680923e0fe4d74a34bdac8141f2540e3ae90623718e47d66d1ca4a2d'

  switch (network) {
    case main:
      return 'Main Net'
    case test:
      return 'Ropsten Network'
    default:
      return 'TestRPC Testnet'
  }
}

function newContractCallback(name) {
  return (contract) => {
    //getAccounts()
     console.log(contract.contractAddress)
      if(!contract.contractAddress) {
          status(`Deploying contract..`)
      } else {

          renderContract(contract, name)
      }

  }
}

function renderContract(contract, contractName) {
  status(`Contract Deployed...`)
  const { transactionHash, contractAddress } = contract
  let  address  = contractAddress
  web3.eth.getTransaction(transactionHash)
   .then((transaction) => {
      
      const props = { ...transaction, ...contract, }
      const details = {
        blockNumber: transaction.blockNumber, 
        contractName, 
        address: contractAddress,
      }

      createContractPanel(details, panel => createContract(props, panel))  
  })
  .catch(console.log)
}

async function createContractPanel(contract, callback) {
  //console.log(contract)
  const div = document.createElement('DIV')
  div.className = 'mui-panel'
  const balance = await balanceInEth(contract.address)
  div.innerHTML = `
    <h3>
      <strong>Contract: </strong> 
      ${contract.contractName}
    </h3>
    <p>
      <strong>Block Number: </strong>
      ${contract.blockNumber}
    </p>
    <p>
      <strong>Contract Balance: </strong>
      ${balance}
    </p>
      <strong>Contract Address: </strong>
      ${contract.address}
    </p>
  `

  callback(div)
}

function createContract(contract, panel) {
  const propHandler = lists => props => {
    if(!filterProps(props[0])) {
      const container = categorizeContractProps({
        key: props[0],
        value: props[1],
        ...lists
      })
      console.log(contract)
      container.append(createContractElement(props, container))
    }
  }

  createPropsContainers(panel, lists => Object
    .entries(contract)
    .forEach(propHandler(lists))
  )
}



function createPropsContainers(panel, callback) {
  document.getElementById('contractFunction').appendChild(panel)
  const propsList = createPanelContainer('props')
  const hashList = createPanelContainer('hashes')
  const functionList = createPanelContainer()
  const banner = '<H3><strong>Contract Functions: </strong></H3>'
  functionList.innerHTML = banner

  panel.append(propsList)
  panel.append(hashList)
  panel.append(functionList)

  callback({ propsList, hashList, functionList })
}

function createPanelContainer(label) {
  const notProp = label !== 'props' || label !== 'hashes'
  const el = notProp ? 'UL' : 'DIV'
  const key = notProp ? 'listStyleType' : 'marginLeft'
  const list = document.createElement(el)

  list.className = notProp ? 'mui-row' : 'mui-panel'
  list.style[key] = notProp ? 'none' : 0

  return list
}

function categorizeContractProps(params) {
  const hashNames = {
    'hash': 'hash',
    'blockHash': 'blockHash',
    'input': 'input',
    'from': 'from',
  }
   
  console.log(params)
  if (hashNames[params.key]) {
    return params.hashList
  }

  if (typeof params.value === 'function') {
    console.log(params)
    return params.functionList
  }

  return params.propsList
}

function filterProps(prop) {
  const excludes = {
    '_eth': '_eth',
    'abi': 'abi',
    'allEvents': 'allEvents',
    'to': 'to',
    'value': 'value',
    'blockNumber': 'blockNumber',
    'address': 'address',
    'transactionHash': 'transactionHash',
  }

  return excludes[prop]
}

function createContractElement(contractProp, container) {  
  return typeof contractProp[1] === 'function'
    ? createContractFunction(contractProp, container)
    : createContractProp(contractProp, 'P')
}

function createContractFunction(contractFunc, container) {
  const name = contractFunc[0]
  const func = contractFunc[1]
 
  const btn = document.createElement('BUTTON')
  btn.className = 'mui-btn mui-btn--primary mui-col-md-2'
  btn.innerText = name

  const eventHandler = () => {
    const div = document.createElement('DIV')
    div.className = 'mui-col-md-3'
    div.innerHTML = `<br /> "${func()}"`

    container.appendChild(div)
  }

  btn.addEventListener('click', eventHandler)

  return btn
}

function createContractProp(contractProp, element) {
  const className = 'mui-col-md-2 mui-panel'
  const name = contractProp[0]
  const value = contractProp[1]
  const hashesNames = {
    'hash': 'hash', 
    'blockHash': 'blockHash',
    'input': 'input',
    'from': 'from',
  }
  
  return hashesNames[name] 
    ? createContractHash(name, value, 'LI')
    : createContractHash(name, value, 'P', className)
}

function createContractHash(name, hash, tag, className) {
  const el = document.createElement(tag)
  const value = name === 'input' 
    ? `<br/><textarea style="width: 100%;">${hash}</textarea>`
    : hash
    
  el.className = className
  el.innerHTML = `<br/><strong>${name}</strong>: ${value}`

  return el  
}
