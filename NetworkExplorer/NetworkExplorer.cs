using System;
using System.Drawing;
using System.Runtime.InteropServices;

using ESRI.ArcGIS.ADF.BaseClasses;
using ESRI.ArcGIS.ADF.CATIDs;
using ESRI.ArcGIS.Framework;
using ESRI.ArcGIS.ArcMapUI;



namespace NetworkExplorer
{
    /// <summary>
    /// Summary description for NetworkExplorer.
    /// </summary>
    [ComVisible(true)]
    [Guid("456180ad-2af9-4201-abfe-86ca9a59ff4d")]
    [ProgId("NetworkExplorer.NetworkExplorer")]
    public sealed class NetworkExplorer : BaseCommand
    {
        private IApplication m_application;
        public NetworkExplorer()
        {
            //
            // TODO: Define values for the public properties
            //
            base.m_category = "CAFM Customizations"; //localizable text
            base.m_caption = "CAFM: Network Explorer";  //localizable text
            base.m_message = "CAFM: Network Explorer";  //localizable text 
            base.m_toolTip = "CAFM: Network Explorer";  //localizable text 
            base.m_name = "CAFM: Network Explorer";   //unique id, non-localizable (e.g. "MyCategory_ArcMapCommand")

            try
            {
                //
                // TODO: change bitmap name if necessary
                //
                string bitmapResourceName = GetType().Name + ".bmp";
                base.m_bitmap = new Bitmap(GetType(), bitmapResourceName);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.WriteLine(ex.Message, "Invalid Bitmap");
            }
        }

        #region Overriden Class Methods

        /// <summary>
        /// Occurs when this command is created
        /// </summary>
        /// <param name="hook">Instance of the application</param>
        public override void OnCreate(object hook)
        {
            if (hook == null)
                return;

            m_application = hook as IApplication;

            //Disable if it is not ArcMap
            if (hook is IMxApplication)
                base.m_enabled = true;
            else
                base.m_enabled = false;

            // TODO:  Add other initialization code
        }

        /// <summary>
        /// Occurs when this command is clicked
        /// </summary>
        public override void OnClick()
        {
            DoTrace traceForm = new DoTrace(m_application);
            traceForm.Show();
        }

        #endregion
    }
}
