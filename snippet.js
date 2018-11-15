System.log("Prepare Data Protection Inputs");
 
var machineInfo = getPropertyValue(payload,"machine");
var properties = getPropertyValue(machineInfo,"properties");
//fetch the prefix for the avamar policy names to filter policies to place the VM
//in avamar domain other policies are excluded to use by manual
var preFix = getPropertyValue(properties,"xx.avamar.policyPrefix");
//fetch the location field value to determine the domain name in avamar to place the VM
var domainName = getPropertyValue(properties,"Vrm.DataCenter.Location");
var vmName = getPropertyValue(machineInfo,"name");
var vCenterVMs = VcPlugin.getAllVirtualMachines();
// if reservation policy is used instead of location, it will use this value to determine the 
// avamar domain name
var selectedReservationPolicyID = getPropertyValue(properties, "__reservationPolicyID");
System.log("Reservation Policy ID : " + selectedReservationPolicyID);
// this action is used to convert the reservationpolicy id to reservation name to determine the 
// avamar domain name
var reservationPolicyName = System.getModule("com.xx.utility").getReservationPolicyByID(selectedReservationPolicyID);
System.log("Reservation Policy Name : " + reservationPolicyName);
domainName = reservationPolicyName;
//all space between the name will be replaced by "_" for all domain names
domainName = domainName.split(" ").join("_").toLowerCase();
System.log("Avamar DomainName : " + domainName);
 
for(var i =0; i< vCenterVMs.length; i++)
{
            if(IsCorrectVM(vCenterVMs[i], vmName)== true)
            {
                        System.log("vmName : "+ vCenterVMs[i].name);
                        virtualMachine = vCenterVMs[i];
                        if(virtualMachine ==null)
                                    throw ("vCenter Instances are not yet added to vRO, so virtualmachine object throws null.");
                        i= vCenterVMs.count;
            }         
}
try{
            // Looking for the domain name added as the endpoint in vRO plugin
            var servers = EdpConfiguration.getEdpSystemsByTenantUrl(domainName);
            if(servers == null || servers.length ==0) {
                        System.log("No matching domain found in endpoint.");
                        throw("No matching domain Name \"" +domainName+"\" found in endpoint.");
            }
 
            System.log("Avamar Endpoint : " + servers[0].providerName);
            // Once the domain is found, fetch all policies for the same domain
            var vmPolicies = System.getModule("com.emc.edp.policy").getAllPolicies(servers[0]);
            System.log("# of Policies : "+vmPolicies.length);
            // Filter the policies based on the prefix of the name. e.g get all policies name starts 
            // with vRA 
            vmPolicies = GetValidatedPolices(vmPolicies, preFix);
            System.log("# vRA of Policies : "+vmPolicies.length);
            // Sort the policies based on the least number of VMs added
            vmPolicies=vmPolicies.sort(function(a,b){
                                    return a.clients.length - b.clients.length;
                        });
            for (var i=0; i < vmPolicies.length; i++)
            {
                        System.log("Policy Name : "+vmPolicies[i].name);
                        System.log("# of Client : " +vmPolicies[i].clients.length);
            }
           
            System.log("least # of Client : " + vmPolicies[0].name);
}
catch(e)
{
            System.error(e);
            throw ("Error While prepare adding VM to Avamar: " + e);
}
 
policyList = [];
// finalist property send to other workflow to add vm to avamar
policyList.push(vmPolicies[0]);
returnProperties = new Properties();
returnProperties.put("xx.avamar.policyname",vmPolicies[0].name);
returnProperties.put("xx.avamar.domainname",domainName);

