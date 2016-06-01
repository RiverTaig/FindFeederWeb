using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

// General Information about an assembly is controlled through the following 
// set of attributes. Change these attribute values to modify the information
// associated with an assembly.
//Notes: Solution Section 09
[assembly: AssemblyTitle("NetworkExplorer")]
[assembly: AssemblyDescription("NetworkExplorer")]
[assembly: AssemblyConfiguration("")]
[assembly: AssemblyCompany("Schneider Electric")]
[assembly: AssemblyProduct("NetworkExplorer")]
[assembly: AssemblyCopyright("Copyright © Schneider Electric 2013")]
[assembly: AssemblyTrademark("")]
[assembly: AssemblyCulture("")]

// Setting ComVisible to false makes the types in this assembly not visible 
// to COM components.  If you need to access a type in this assembly from 
// COM, set the ComVisible attribute to true on that type.
[assembly: ComVisible(true)]

// The following GUID is for the ID of the type-lib if this project is exposed to COM
[assembly: Guid("c1177205-0918-4280-b9c8-a5577762e2e5")]

// Version information for an assembly consists of the following four values:
//
//      Major Version
//      Minor Version 
//      Build Number
//      Revision
//
// You can specify all the values or you can default the Revision and Build Numbers 
// by using the '*' as shown below:
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

[assembly: log4net.Config.RepositoryAttribute("Miner")]
#if DEBUG || TRACINGDEBUG
[assembly: log4net.Config.XmlConfigurator(ConfigFile = "miner.log4netD.config",Watch=true)]
#else
	[assembly: log4net.Config.XmlConfigurator(ConfigFile = "miner.log4net.config",Watch=true)]
#endif

