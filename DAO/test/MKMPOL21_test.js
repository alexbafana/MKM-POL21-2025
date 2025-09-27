//parameters: DAO_name, addresses_list, addresses, owner_role_value, role_value, role_address, role_name
const { expect } = require("chai");

const {
  loadFixture,
}= require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("MKMPOL21 Permission Manager contract", function () {
  let addresses = null;
  let addressesByEntityValue = null;

  async function deployFixture(){
    const [owner, addr0, addr1, addr2, addr3, addr4, addr6, addr7, addr8] = await ethers.getSigners();
    const MKMPOL21 = await ethers.deployContract("MKMPOL21");
    await MKMPOL21.waitForDeployment();

    return{MKMPOL21, owner, addr0, addr1, addr2, addr3, addr4, addr6, addr7, addr8};
 }
    it("Should set the right owner and initialize committees", async function (){
      const{MKMPOL21, owner, addr6  , addr7  , addr8  } = await loadFixture(deployFixture);
      expect(await MKMPOL21.hasRole(owner.address)).to.equal(1029);
      // Initialize committees
      ownerConnect = MKMPOL21.connect(owner);

      const tx = await ownerConnect.initializeCommittees(addr6.address  , addr7.address  , addr8.address );
      await tx.wait();
      expect(tx).to.not.be.reverted;
   });

    it("Control relations should reflect the organizational structure of the DAO.", async function (){
      let{MKMPOL21, owner, addr0, addr1, addr2, addr3, addr4, addr6, addr7, addr8} = await loadFixture(deployFixture);

    ownerConnect = MKMPOL21.connect(owner);
    
    addr0Connect = MKMPOL21.connect(addr0);
    
    addr1Connect = MKMPOL21.connect(addr1);
    
    addr2Connect = MKMPOL21.connect(addr2);
    
    addr3Connect = MKMPOL21.connect(addr3);
    
    addr4Connect = MKMPOL21.connect(addr4);
    
    addr6Connect = MKMPOL21.connect(addr6);
    
    addr7Connect = MKMPOL21.connect(addr7);
    
    addr8Connect = MKMPOL21.connect(addr8);
    

      // Map to link roles with addresses
      addressesByEntityValue = new Map();
      
      addressesByEntityValue.set(1152, addr0);
      
      addressesByEntityValue.set(1153, addr1);
      
      addressesByEntityValue.set(3074, addr2);
      
      addressesByEntityValue.set(3075, addr3);
      
      addressesByEntityValue.set(1156, addr4);
      
      addressesByEntityValue.set(1029, owner);
      
      addressesByEntityValue.set(1030, addr6);
      
      addressesByEntityValue.set(1031, addr7);
      
      addressesByEntityValue.set(1032, addr8);
      

      // Iterate over the mapping and assign roles
      for (const [roleValue, addr] of addressesByEntityValue.entries()){
        try{
          console.log(`Assigning role ${roleValue} to address ${addr.address}`);
          const tx = await ownerConnect.assignRole(addr.address, roleValue);
          await tx.wait();
          console.log(`Role ${roleValue} successfully assigned to address ${addr.address}`);
       } catch (error){
          console.error(`Failed to assign role ${roleValue} to address ${addr.address}:`, error);
          throw error; // Stop execution if there's an error
       }
     }

      // Validate control relations
      let result = null;
      
      result = await MKMPOL21.canControl(1152, 1152);
      console.log(`Result of canControl(Member_Institution, Member_Institution):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1152, 1153);
      console.log(`Result of canControl(Member_Institution, Ordinary_User):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1152, 3074);
      console.log(`Result of canControl(Member_Institution, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1152, 3075);
      console.log(`Result of canControl(Member_Institution, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1152, 1156);
      console.log(`Result of canControl(Member_Institution, Data_Validator):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1152, 1029);
      console.log(`Result of canControl(Member_Institution, MKMPOL21Owner):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1152, 1030);
      console.log(`Result of canControl(Member_Institution, Consortium):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1152, 1031);
      console.log(`Result of canControl(Member_Institution, Validation_Committee):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1152, 1032);
      console.log(`Result of canControl(Member_Institution, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 1152);
      console.log(`Result of canControl(Ordinary_User, Member_Institution):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 1153);
      console.log(`Result of canControl(Ordinary_User, Ordinary_User):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 3074);
      console.log(`Result of canControl(Ordinary_User, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 3075);
      console.log(`Result of canControl(Ordinary_User, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 1156);
      console.log(`Result of canControl(Ordinary_User, Data_Validator):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 1029);
      console.log(`Result of canControl(Ordinary_User, MKMPOL21Owner):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 1030);
      console.log(`Result of canControl(Ordinary_User, Consortium):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 1031);
      console.log(`Result of canControl(Ordinary_User, Validation_Committee):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1153, 1032);
      console.log(`Result of canControl(Ordinary_User, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3074, 1152);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, Member_Institution):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(3074, 1153);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, Ordinary_User):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(3074, 3074);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3074, 3075);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3074, 1156);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, Data_Validator):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(3074, 1029);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, MKMPOL21Owner):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3074, 1030);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, Consortium):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3074, 1031);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, Validation_Committee):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3074, 1032);
      console.log(`Result of canControl(MFSSIA_Guardian_Agent, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 1152);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, Member_Institution):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 1153);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, Ordinary_User):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 3074);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 3075);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 1156);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, Data_Validator):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 1029);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, MKMPOL21Owner):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 1030);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, Consortium):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 1031);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, Validation_Committee):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(3075, 1032);
      console.log(`Result of canControl(Eliza_Data_Extractor_Agent, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 1152);
      console.log(`Result of canControl(Data_Validator, Member_Institution):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 1153);
      console.log(`Result of canControl(Data_Validator, Ordinary_User):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 3074);
      console.log(`Result of canControl(Data_Validator, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 3075);
      console.log(`Result of canControl(Data_Validator, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 1156);
      console.log(`Result of canControl(Data_Validator, Data_Validator):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 1029);
      console.log(`Result of canControl(Data_Validator, MKMPOL21Owner):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 1030);
      console.log(`Result of canControl(Data_Validator, Consortium):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 1031);
      console.log(`Result of canControl(Data_Validator, Validation_Committee):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1156, 1032);
      console.log(`Result of canControl(Data_Validator, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1029, 1152);
      console.log(`Result of canControl(MKMPOL21Owner, Member_Institution):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1029, 1153);
      console.log(`Result of canControl(MKMPOL21Owner, Ordinary_User):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1029, 3074);
      console.log(`Result of canControl(MKMPOL21Owner, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1029, 3075);
      console.log(`Result of canControl(MKMPOL21Owner, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1029, 1156);
      console.log(`Result of canControl(MKMPOL21Owner, Data_Validator):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1029, 1029);
      console.log(`Result of canControl(MKMPOL21Owner, MKMPOL21Owner):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1029, 1030);
      console.log(`Result of canControl(MKMPOL21Owner, Consortium):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1029, 1031);
      console.log(`Result of canControl(MKMPOL21Owner, Validation_Committee):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1029, 1032);
      console.log(`Result of canControl(MKMPOL21Owner, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1030, 1152);
      console.log(`Result of canControl(Consortium, Member_Institution):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1030, 1153);
      console.log(`Result of canControl(Consortium, Ordinary_User):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1030, 3074);
      console.log(`Result of canControl(Consortium, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1030, 3075);
      console.log(`Result of canControl(Consortium, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( true );
      
      result = await MKMPOL21.canControl(1030, 1156);
      console.log(`Result of canControl(Consortium, Data_Validator):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1030, 1029);
      console.log(`Result of canControl(Consortium, MKMPOL21Owner):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1030, 1030);
      console.log(`Result of canControl(Consortium, Consortium):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1030, 1031);
      console.log(`Result of canControl(Consortium, Validation_Committee):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1030, 1032);
      console.log(`Result of canControl(Consortium, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 1152);
      console.log(`Result of canControl(Validation_Committee, Member_Institution):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 1153);
      console.log(`Result of canControl(Validation_Committee, Ordinary_User):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 3074);
      console.log(`Result of canControl(Validation_Committee, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 3075);
      console.log(`Result of canControl(Validation_Committee, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 1156);
      console.log(`Result of canControl(Validation_Committee, Data_Validator):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 1029);
      console.log(`Result of canControl(Validation_Committee, MKMPOL21Owner):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 1030);
      console.log(`Result of canControl(Validation_Committee, Consortium):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 1031);
      console.log(`Result of canControl(Validation_Committee, Validation_Committee):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1031, 1032);
      console.log(`Result of canControl(Validation_Committee, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 1152);
      console.log(`Result of canControl(Dispute_Resolution_Board, Member_Institution):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 1153);
      console.log(`Result of canControl(Dispute_Resolution_Board, Ordinary_User):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 3074);
      console.log(`Result of canControl(Dispute_Resolution_Board, MFSSIA_Guardian_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 3075);
      console.log(`Result of canControl(Dispute_Resolution_Board, Eliza_Data_Extractor_Agent):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 1156);
      console.log(`Result of canControl(Dispute_Resolution_Board, Data_Validator):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 1029);
      console.log(`Result of canControl(Dispute_Resolution_Board, MKMPOL21Owner):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 1030);
      console.log(`Result of canControl(Dispute_Resolution_Board, Consortium):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 1031);
      console.log(`Result of canControl(Dispute_Resolution_Board, Validation_Committee):`, result);
      expect(result).to.equal( false );
      
      result = await MKMPOL21.canControl(1032, 1032);
      console.log(`Result of canControl(Dispute_Resolution_Board, Dispute_Resolution_Board):`, result);
      expect(result).to.equal( false );
      
   });

it("Permissions should be properly configured.", async function (){
      
      
      await expect(addr0Connect.Accept_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr0Connect.request_revision_of_data();
      console.log(`Execution result of permission (request_revision_of_data by Member_Institution)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr0Connect.Propose_Modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr0Connect.Accept_modification_to_revision();
      console.log(`Execution result of permission (Accept_modification_to_revision by Member_Institution)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr0Connect.Modify_Statute()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Upgrade_smart_contracts()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Reject_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr0Connect.edit_data_point_inclusion_proposal();
      console.log(`Execution result of permission (edit_data_point_inclusion_proposal by Member_Institution)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr0Connect.submit_data_point_inclusion_proposal();
      console.log(`Execution result of permission (submit_data_point_inclusion_proposal by Member_Institution)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr0Connect.add_metadata();
      console.log(`Execution result of permission (add_metadata by Member_Institution)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr0Connect.inspect_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Access_Challenge_Set()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Validate_response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Access_Challenge_Response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Green_light_authentication()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Retrieve_Data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Make_Prediction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Notify_Contradiction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.onboard_ordinary_user()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.onboard_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.remove_ordinary_member()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.remove_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr0Connect.submit_query_to_eliza_agent();
      console.log(`Execution result of permission (submit_query_to_eliza_agent by Member_Institution)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr0Connect.Issue_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.Burn_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.mint_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.burn_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr0Connect.distribute_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Accept_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr1Connect.request_revision_of_data();
      console.log(`Execution result of permission (request_revision_of_data by Ordinary_User)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr1Connect.Propose_Modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr1Connect.Accept_modification_to_revision();
      console.log(`Execution result of permission (Accept_modification_to_revision by Ordinary_User)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr1Connect.Modify_Statute()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Upgrade_smart_contracts()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Reject_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.edit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.submit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.add_metadata()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.inspect_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Access_Challenge_Set()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Validate_response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Access_Challenge_Response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Green_light_authentication()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Retrieve_Data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Make_Prediction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Notify_Contradiction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.onboard_ordinary_user()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.onboard_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.remove_ordinary_member()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.remove_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr1Connect.submit_query_to_eliza_agent();
      console.log(`Execution result of permission (submit_query_to_eliza_agent by Ordinary_User)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr1Connect.Issue_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.Burn_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.mint_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.burn_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr1Connect.distribute_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.Accept_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.request_revision_of_data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.Propose_Modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.Accept_modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.Modify_Statute()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.Upgrade_smart_contracts()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.Reject_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.edit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.submit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.add_metadata()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.inspect_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr2Connect.Access_Challenge_Set();
      console.log(`Execution result of permission (Access_Challenge_Set by MFSSIA_Guardian_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr2Connect.Validate_response();
      console.log(`Execution result of permission (Validate_response by MFSSIA_Guardian_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr2Connect.Access_Challenge_Response();
      console.log(`Execution result of permission (Access_Challenge_Response by MFSSIA_Guardian_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr2Connect.Green_light_authentication();
      console.log(`Execution result of permission (Green_light_authentication by MFSSIA_Guardian_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr2Connect.Retrieve_Data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.Make_Prediction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.Notify_Contradiction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr2Connect.onboard_ordinary_user();
      console.log(`Execution result of permission (onboard_ordinary_user by MFSSIA_Guardian_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr2Connect.onboard_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr2Connect.remove_ordinary_member();
      console.log(`Execution result of permission (remove_ordinary_member by MFSSIA_Guardian_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr2Connect.remove_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.submit_query_to_eliza_agent()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr2Connect.Issue_DID();
      console.log(`Execution result of permission (Issue_DID by MFSSIA_Guardian_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr2Connect.Burn_DID();
      console.log(`Execution result of permission (Burn_DID by MFSSIA_Guardian_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr2Connect.mint_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.burn_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr2Connect.distribute_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Accept_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.request_revision_of_data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Propose_Modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Accept_modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Modify_Statute()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Upgrade_smart_contracts()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Reject_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.edit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.submit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.add_metadata()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.inspect_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Access_Challenge_Set()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Validate_response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Access_Challenge_Response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Green_light_authentication()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr3Connect.Retrieve_Data();
      console.log(`Execution result of permission (Retrieve_Data by Eliza_Data_Extractor_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr3Connect.Make_Prediction();
      console.log(`Execution result of permission (Make_Prediction by Eliza_Data_Extractor_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr3Connect.Notify_Contradiction();
      console.log(`Execution result of permission (Notify_Contradiction by Eliza_Data_Extractor_Agent)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr3Connect.onboard_ordinary_user()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.onboard_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.remove_ordinary_member()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.remove_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.submit_query_to_eliza_agent()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Issue_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.Burn_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.mint_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.burn_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr3Connect.distribute_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Accept_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr4Connect.request_revision_of_data();
      console.log(`Execution result of permission (request_revision_of_data by Data_Validator)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr4Connect.Propose_Modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr4Connect.Accept_modification_to_revision();
      console.log(`Execution result of permission (Accept_modification_to_revision by Data_Validator)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr4Connect.Modify_Statute()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Upgrade_smart_contracts()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Reject_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr4Connect.edit_data_point_inclusion_proposal();
      console.log(`Execution result of permission (edit_data_point_inclusion_proposal by Data_Validator)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr4Connect.submit_data_point_inclusion_proposal();
      console.log(`Execution result of permission (submit_data_point_inclusion_proposal by Data_Validator)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr4Connect.add_metadata();
      console.log(`Execution result of permission (add_metadata by Data_Validator)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr4Connect.inspect_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Access_Challenge_Set()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Validate_response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Access_Challenge_Response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Green_light_authentication()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Retrieve_Data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Make_Prediction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Notify_Contradiction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.onboard_ordinary_user()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.onboard_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.remove_ordinary_member()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.remove_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr4Connect.submit_query_to_eliza_agent();
      console.log(`Execution result of permission (submit_query_to_eliza_agent by Data_Validator)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr4Connect.Issue_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.Burn_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.mint_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.burn_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr4Connect.distribute_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await ownerConnect.Accept_revision();
      console.log(`Execution result of permission (Accept_revision by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.request_revision_of_data();
      console.log(`Execution result of permission (request_revision_of_data by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Propose_Modification_to_revision();
      console.log(`Execution result of permission (Propose_Modification_to_revision by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Accept_modification_to_revision();
      console.log(`Execution result of permission (Accept_modification_to_revision by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Modify_Statute();
      console.log(`Execution result of permission (Modify_Statute by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Upgrade_smart_contracts();
      console.log(`Execution result of permission (Upgrade_smart_contracts by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Reject_data_point();
      console.log(`Execution result of permission (Reject_data_point by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.edit_data_point_inclusion_proposal();
      console.log(`Execution result of permission (edit_data_point_inclusion_proposal by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.submit_data_point_inclusion_proposal();
      console.log(`Execution result of permission (submit_data_point_inclusion_proposal by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.add_metadata();
      console.log(`Execution result of permission (add_metadata by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.inspect_data_point();
      console.log(`Execution result of permission (inspect_data_point by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Access_Challenge_Set();
      console.log(`Execution result of permission (Access_Challenge_Set by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Validate_response();
      console.log(`Execution result of permission (Validate_response by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Access_Challenge_Response();
      console.log(`Execution result of permission (Access_Challenge_Response by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Green_light_authentication();
      console.log(`Execution result of permission (Green_light_authentication by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Retrieve_Data();
      console.log(`Execution result of permission (Retrieve_Data by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Make_Prediction();
      console.log(`Execution result of permission (Make_Prediction by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Notify_Contradiction();
      console.log(`Execution result of permission (Notify_Contradiction by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.onboard_ordinary_user();
      console.log(`Execution result of permission (onboard_ordinary_user by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.onboard_institution();
      console.log(`Execution result of permission (onboard_institution by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.remove_ordinary_member();
      console.log(`Execution result of permission (remove_ordinary_member by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.remove_institution();
      console.log(`Execution result of permission (remove_institution by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.submit_query_to_eliza_agent();
      console.log(`Execution result of permission (submit_query_to_eliza_agent by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Issue_DID();
      console.log(`Execution result of permission (Issue_DID by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.Burn_DID();
      console.log(`Execution result of permission (Burn_DID by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.mint_MKMT();
      console.log(`Execution result of permission (mint_MKMT by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.burn_MKMT();
      console.log(`Execution result of permission (burn_MKMT by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await ownerConnect.distribute_MKMT();
      console.log(`Execution result of permission (distribute_MKMT by MKMPOL21Owner)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr6Connect.Accept_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.request_revision_of_data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Propose_Modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Accept_modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr6Connect.Modify_Statute();
      console.log(`Execution result of permission (Modify_Statute by Consortium)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr6Connect.Upgrade_smart_contracts();
      console.log(`Execution result of permission (Upgrade_smart_contracts by Consortium)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr6Connect.Reject_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.edit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.submit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.add_metadata()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.inspect_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Access_Challenge_Set()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Validate_response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Access_Challenge_Response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Green_light_authentication()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Retrieve_Data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Make_Prediction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Notify_Contradiction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.onboard_ordinary_user()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr6Connect.onboard_institution();
      console.log(`Execution result of permission (onboard_institution by Consortium)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr6Connect.remove_ordinary_member()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr6Connect.remove_institution();
      console.log(`Execution result of permission (remove_institution by Consortium)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr6Connect.submit_query_to_eliza_agent()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Issue_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr6Connect.Burn_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr6Connect.mint_MKMT();
      console.log(`Execution result of permission (mint_MKMT by Consortium)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr6Connect.burn_MKMT();
      console.log(`Execution result of permission (burn_MKMT by Consortium)`);
      await expect(result).not.to.be.reverted;
      
      
      
      result = await addr6Connect.distribute_MKMT();
      console.log(`Execution result of permission (distribute_MKMT by Consortium)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr7Connect.Accept_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.request_revision_of_data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Propose_Modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Accept_modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Modify_Statute()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Upgrade_smart_contracts()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr7Connect.Reject_data_point();
      console.log(`Execution result of permission (Reject_data_point by Validation_Committee)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr7Connect.edit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.submit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.add_metadata()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr7Connect.inspect_data_point();
      console.log(`Execution result of permission (inspect_data_point by Validation_Committee)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr7Connect.Access_Challenge_Set()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Validate_response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Access_Challenge_Response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Green_light_authentication()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Retrieve_Data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Make_Prediction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Notify_Contradiction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.onboard_ordinary_user()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.onboard_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.remove_ordinary_member()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.remove_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.submit_query_to_eliza_agent()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Issue_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.Burn_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.mint_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.burn_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr7Connect.distribute_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr8Connect.Accept_revision();
      console.log(`Execution result of permission (Accept_revision by Dispute_Resolution_Board)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr8Connect.request_revision_of_data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      result = await addr8Connect.Propose_Modification_to_revision();
      console.log(`Execution result of permission (Propose_Modification_to_revision by Dispute_Resolution_Board)`);
      await expect(result).not.to.be.reverted;
      
      
      
      await expect(addr8Connect.Accept_modification_to_revision()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Modify_Statute()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Upgrade_smart_contracts()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Reject_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.edit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.submit_data_point_inclusion_proposal()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.add_metadata()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.inspect_data_point()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Access_Challenge_Set()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Validate_response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Access_Challenge_Response()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Green_light_authentication()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Retrieve_Data()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Make_Prediction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Notify_Contradiction()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.onboard_ordinary_user()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.onboard_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.remove_ordinary_member()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.remove_institution()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.submit_query_to_eliza_agent()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Issue_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.Burn_DID()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.mint_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.burn_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
      
      await expect(addr8Connect.distribute_MKMT()).to.be.revertedWith(
        "User does not have this permission"
      );
      
      
});
      //TODO: test contract logic 
});
