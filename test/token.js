const UbaiCoin = artifacts.require('./UbaiCoin.sol')
const utils = require('./helpers/Utils.js')

contract('Ubai Coin', function (accounts) {

  let token
  beforeEach(async function () {
    token = await UbaiCoin.new()
  })


  describe('Ubai contract setup', function () {
    it('verifies that coin name is UBI', async function () {
      assert.equal(await token.name(), 'UBI')
    })

    it('verifies that symbol is UBI', async function () {
      assert.equal(await token.symbol(), 'UBI')
    })

    it('verifies that decimals is 18', async function () {
      assert.equal(await token.decimals(), 18)
    })

    it('verifies that total supply is 100 000 000 tokens', async function () {
      assert.equal(await token.totalSupply(), 100000000000000000000000000)
    })

    it('verifies that total supply belongs to the contract address', async function () {
      assert.equal((await token.balanceOf.call(token.address)), 100000000000000000000000000)
    })

  })


  describe('Ownership', () => {
    it('verifies that owner is a deployer', async () => {
      const owner = await token.owner.call()
      assert.equal(owner, accounts[0])
    })

    it('verifies that owner is a new address after transfering ownership', async () => {
      await token.transferOwnership(accounts[1])
      const owner = await token.owner.call()
      assert.equal(owner, accounts[1])
    })

    it('verifies that ownership transfer has an OwnershipTransferred event', async () => {
      const res = await token.transferOwnership(accounts[1])
      assert(res.logs.length > 0 && res.logs[0].event === 'OwnershipTransferred')
    })

    it('verifies that owner is 0x0 after renounce ownership ', async () => {
      await token.renounceOwnership()
      const owner = await token.owner.call()
      assert.equal(owner, utils.zeroAddress)
    })

    it('verifies that only owner allowed to call ownership transfer', async () => {
      try {
        await token.transferOwnership(accounts[1], { from: accounts[2] })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies that only owner allowed to call airdrop', async () => {
      try {
        await token.airdrop([accounts[1], accounts[2], accounts[3]], [4000, 1, 6000], { from: accounts[2] })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies that only owner allowed to call transferTokens', async () => {
      try {
        await token.transferTokens(accounts[1], 4000, { from: accounts[2] })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies that only owner allowed to call freeze', async () => {
      try {
        await token.freeze(accounts[1], true, { from: accounts[2] })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })
  })


  describe('ERC20 transfer', () => {
    const owner = accounts[0]
    const to = accounts[1]
    const amount = 100

    it('should allow when attempting to transfer to the new wallet', async () => {
      await token.transferTokens(owner, amount)
      await token.transfer(to, amount)
      assert.equal((await token.balanceOf(owner)), 0)
      assert.equal(await token.balanceOf(to), amount)
    })

    it('should allow when attempting to transfer to the new wallet', async () => {
      try {
        await token.transfer(to, amount)
        assert(true, 'allow')
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('should allow when attempting to transfer to the new wallet', async () => {
      try {
        await token.transfer(utils.zeroAddress, amount)
        assert(true, 'allow')
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })
  })


  describe('ERC20 approve', () => {
    const owner = accounts[0]
    const to = accounts[1]
    const amount = 100

    it('verifies the allowance after an approval', async () => {
      await token.approve(to, amount)
      const allowance = await token.allowance.call(owner, to)
      assert.equal(allowance, amount)
    })

    it('verifies that an approval fires an Approval event', async () => {
      await token.transferTokens(owner, 500)
      const res = await token.approve(owner, 500)
      assert(res.logs.length > 0 && res.logs[0].event === 'Approval');
    })

    it('should throw when attempting to transfer from another account more than the allowance', async () => {
      try {
        await token.approve(utils.zeroAddress, amount)
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })
  })


  describe('ERC20 transferFrom', () => {
    const amount = 500
    const owner = accounts[0]
    const to = accounts[1]

    it('verifies that transferring from another account fires a Transfer event', async () => {
      await token.transferTokens(owner, amount)
      await token.approve(to, amount)
      assert.equal(await token.balanceOf.call(to), 0)

      const allowance = await token.allowance.call(owner, to)
      assert.equal(allowance, 500)

      const res = await token.transferFrom(owner, accounts[2], amount, { from: to })
      assert(res.logs.length > 0 && res.logs[0].event === 'Transfer')

      const allowanceNew = await token.allowance.call(owner, to)
      assert.equal(allowanceNew, 0)

      assert.equal(await token.balanceOf.call(owner), 0)
      assert.equal(await token.balanceOf.call(to), 0)
      assert.equal(await token.balanceOf.call(accounts[2]), 500)

    });

    it('verifies the new allowance after transferring from another account', async () => {
      await token.transferTokens(owner, amount)
      await token.approve(to, amount)
      await token.transferFrom(accounts[0], accounts[2], 50, { from: to })
      const allowance = await token.allowance.call(owner, to)
      assert.equal(allowance, 450)
    })

    it('should throw when attempting to transfer from another account more than the allowance', async () => {
      await token.transferTokens(owner, amount)
      await token.approve(to, 100)
      try {
        await token.transferFrom(owner, accounts[2], 200, { from: to })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('should throw when attempting to transfer from an invalid account', async () => {
      await token.transferTokens(owner, amount)
      await token.approve(to, 100)
      try {
        await token.transferFrom(utils.zeroAddress, accounts[2], 50, { from: to })
        assert(false, "didn't throw")
      }
      catch (error) {
        const allowance = await token.allowance.call(owner, to)
        assert.equal(allowance, 100)
        return utils.ensureException(error)
      }
    })

  })


  describe('ERC20 decrease allowance', () => {
    const owner = accounts[0]
    const to = accounts[1]
    const amount = 100

    it('should throw when decreaseAllowance to zero address', async () => {
      await token.transferTokens(owner, amount)
      try {
        await token.decreaseAllowance(utils.zeroAddress, 100)
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies that decreaseAllowance works correctly', async () => {
      await token.transferTokens(owner, amount)
      await token.approve(to, amount)
      await token.decreaseAllowance(to, amount)
      const allowance = await token.allowance.call(owner, to)
      assert.equal(allowance, 0)
    })

  })


  describe('ERC20 increase allowance', () => {
    const owner = accounts[0]
    const to = accounts[1]
    const amount = 100

    it('verifies that an increaseAllowance fires an Approval event', async () => {
      await token.transferTokens(owner, 500)
      const res = await token.increaseAllowance(owner, 500)
      assert(res.logs.length > 0 && res.logs[0].event === 'Approval');
    })

    it('should throw when increaseAllowance to zero address', async () => {
      await token.transferTokens(owner, amount)
      try {
        await token.increaseAllowance(utils.zeroAddress, 100)
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies that increaseAllowance works correctly', async () => {
      await token.transferTokens(owner, amount)
      await token.approve(to, amount)
      await token.increaseAllowance(to, amount)
      const allowance = await token.allowance.call(owner, to)
      assert.equal(allowance, amount * 2)
    })

  })


  describe('Airdrop', () => {

    it('verifies that airdrop works correctly', async () => {
      const numberOfAddresses = 400
      let arrayOfAccounts = [];
      let arrayOfAmountsOfTokens = [];
      for (let i = 0; i < numberOfAddresses; i++) {
        arrayOfAccounts.push(accounts[1])
        arrayOfAmountsOfTokens.push(1)
      }

      // const gasEstimation = await token.airdrop.estimateGas(arrayOfAccounts, arrayOfAmountsOfTokens);
      // console.log(gasEstimation)
      await token.airdrop(arrayOfAccounts, arrayOfAmountsOfTokens)
      const airdropFirst = await token.balanceOf.call(accounts[1])
      assert.equal(airdropFirst.toNumber(), numberOfAddresses)
    })

    it('verifies that airdrop will be revert, because contract does not have enough tokens', async () => {

      try {
        await token.airdrop([accounts[1], accounts[2], accounts[3]], [100000000000000000000000000, 1, 6000])
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies that airdrop will be revert, because different lengths of arrays', async () => {

      try {
        await token.airdrop([accounts[1], accounts[2], accounts[3]], [100000000000000000000000000, 1])
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

  })

  describe('Freeze logic', () => {
    const owner = accounts[0]
    const to = accounts[1]
    const amount = 100

    it('verifies transferring during freezing and unfreezing', async () => {
      await token.transferTokens(to, amount)
      assert.equal(await token.isFrozen(to), false)
      await token.freeze(to, true)
      assert.equal(await token.isFrozen(to), true)
      try {
        await token.transfer(to, amount, { from: to })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
      await token.freeze(to, false)
      assert.equal(await token.isFrozen(to), false)
      try {
        await token.transfer(to, amount, { from: to })
      }
      catch (error) {
        assert(false, "ain't unfrozen")
        return utils.ensureException(error)
      }
    })
  })

  describe('Mint logic', () => {
    const to = accounts[1]
    const amount = 100

    it('verifies that not owner cannot mint on the address', async () => {
      try {
        await token.mint(to, amount, { from: accounts[2] })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies minted tokens on the address and a mint event', async () => {
      const initialBalance = await token.balanceOf.call(to)
      const res = await token.mint(to, amount)
      const newBalance = await token.balanceOf.call(to)
      assert.equal(newBalance.toNumber(), initialBalance.toNumber() + amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Mint')
    })

    it('verifies total supply and a mint event', async () => {
      const initialSupply = await token.totalSupply()
      const res = await token.mint(to, amount)
      const newSupply = await token.totalSupply()
      assert.equal(newSupply.toNumber(), initialSupply.toNumber() + amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Mint')
    })

    it('verifies minted tokens on the address and a mint event during freezing', async () => {
      await token.freeze(to, true)
      const initialBalance = await token.balanceOf.call(to)
      const res = await token.mint(to, amount)
      const newBalance = await token.balanceOf.call(to)
      assert.equal(newBalance.toNumber(), initialBalance.toNumber() + amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Mint')
    })

    it('verifies total supply and a mint event during freezing', async () => {
      await token.freeze(to, true)
      const initialSupply = await token.totalSupply()
      const res = await token.mint(to, amount)
      const newSupply = await token.totalSupply()
      assert.equal(newSupply.toNumber(), initialSupply.toNumber() + amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Mint')
    })
  })

  describe('Burn logic', () => {
    const from = accounts[1]
    const amount = 100

    beforeEach(async () => {
      await token.mint(from, 3 * amount)
    })


    it('verifies that not owner cannot burn from the address', async () => {
      try {
        await token.burnFrom(from, amount, { from: accounts[2] })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies burnt tokens on the address and a burn event', async () => {
      const initialBalance = await token.balanceOf.call(from)
      const res = await token.burnFrom(from, amount)
      const newBalance = await token.balanceOf.call(from)
      assert.equal(newBalance.toNumber(), initialBalance.toNumber() - amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Burn')
    })

    it('verifies total supply and a burn event', async () => {
      const initialSupply = await token.totalSupply()
      const res = await token.burnFrom(from, amount)
      const newSupply = await token.totalSupply()
      assert.equal(newSupply.toNumber(), initialSupply.toNumber() - amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Burn')
    })


  })

  describe('Mint logic', () => {
    const to = accounts[1]
    const amount = 100

    it('verifies that not owner cannot mint on the address', async () => {
      try {
        await token.mint(to, amount, { from: accounts[2] })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

    it('verifies minted tokens on the address and a mint event', async () => {
      const initialBalance = await token.balanceOf.call(to)
      const res = await token.mint(to, amount)
      const newBalance = await token.balanceOf.call(to)
      assert.equal(newBalance.toNumber(), initialBalance.toNumber() + amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Mint')
    })

    it('verifies total supply and a mint event', async () => {
      const initialSupply = await token.totalSupply()
      const res = await token.mint(to, amount)
      const newSupply = await token.totalSupply()
      assert.equal(newSupply.toNumber(), initialSupply.toNumber() + amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Mint')
    })
  })

  describe('Burn + freeze logic ', () => {
    const from = accounts[1]
    const amount = 100

    beforeEach(async () => {
      await token.freeze(from, true)
      await token.mint(from, 3 * amount)
    })

    it('verifies burnt tokens on the address and a burn event during freezing', async () => {
      const initialBalance = await token.balanceOf.call(from)
      const res = await token.burnFrom(from, amount)
      const newBalance = await token.balanceOf.call(from)
      assert.equal(newBalance.toNumber(), initialBalance.toNumber() - amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Burn')
    })

    it('verifies total supply and a burn event during freezing', async () => {
      const initialSupply = await token.totalSupply()
      const res = await token.burnFrom(from, amount)
      const newSupply = await token.totalSupply()
      assert.equal(newSupply.toNumber(), initialSupply.toNumber() - amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Burn')
    })
  })

  describe('Mint + freeze logic', () => {
    const to = accounts[1]
    const amount = 100

    it('verifies minted tokens on the address and a mint event during freezing', async () => {
      await token.freeze(to, true)
      const initialBalance = await token.balanceOf.call(to)
      const res = await token.mint(to, amount)
      const newBalance = await token.balanceOf.call(to)
      assert.equal(newBalance.toNumber(), initialBalance.toNumber() + amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Mint')
    })

    it('verifies total supply and a mint event during freezing', async () => {
      await token.freeze(to, true)
      const initialSupply = await token.totalSupply()
      const res = await token.mint(to, amount)
      const newSupply = await token.totalSupply()
      assert.equal(newSupply.toNumber(), initialSupply.toNumber() + amount)
      assert(res.logs.length > 0 && res.logs[0].event === 'Mint')
    })
  })
})

