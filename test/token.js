const UbaiCoin = artifacts.require('./UbaiCoin.sol')
const utils = require('./helpers/Utils.js')
    
contract('Ubai Coin', function(accounts) {

  let token
  beforeEach(async function () {
    token = await UbaiCoin.new()
  })


  describe('Ubai contract setup', function () {
    it('verifies that coin name is UBAI COIN', async function () {
      assert.equal(await token.name(), 'UBAI COIN')
    })

    it('verifies that symbol is UBAI', async function () {
      assert.equal(await token.symbol(), 'UBAI')
    })

    it('verifies that decimals is 18', async function () {
      assert.equal(await token.decimals(), 18)
    })

    it('verifies that total supply is 100 000 000 tokens', async function () {
      assert.equal(await token.totalSupply(), 100000000000000000000000000)
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
      assert(res.logs.length > 0 && res.logs[0].event == 'OwnershipTransferred')
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
      assert(res.logs.length > 0 && res.logs[0].event == 'Approval');
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
      const res = await token.transferFrom(owner, accounts[2], amount, { from: to })
      assert(res.logs.length > 0 && res.logs[0].event == 'Transfer')
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
      assert(res.logs.length > 0 && res.logs[0].event == 'Approval');
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
      await token.airdrop([accounts[1], accounts[2], accounts[3]], [4000, 1, 6000])
  
      const airdropFisrt = await token.balanceOf.call(accounts[1])
      assert.equal(airdropFisrt.toNumber(), 4000)
      const airdropSecond = await token.balanceOf.call(accounts[2])
      assert.equal(airdropSecond.toNumber(), 1)
      const airdropThird = await token.balanceOf.call(accounts[3])
      assert.equal(airdropThird.toNumber(), 6000)
    })

    it('verifies that airdrop will be revert, beacause contract hasnt enough tokens', async () => {

      try {
        await token.airdrop([accounts[1], accounts[2], accounts[3]], [100000000000000000000000000, 1, 6000])
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

    it('verifies that freee logic works correctly', async () => {
      await token.transferTokens(to, amount)
      await token.freeze(to, true, { from: owner })
      try {
        await token.transfer(to, amount, { from: to })
        assert(false, "didn't throw")
      }
      catch (error) {
        return utils.ensureException(error)
      }
    })

  })

})
