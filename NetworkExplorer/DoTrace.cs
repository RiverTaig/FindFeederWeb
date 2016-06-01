using System;
using System.Collections.Generic;
using System.Drawing;
using System.Windows.Forms;
using System.Runtime.InteropServices;
using System.Collections;

using ESRI.ArcGIS.Display;
using ESRI.ArcGIS.Geometry;
using ESRI.ArcGIS.Carto;
using ESRI.ArcGIS.Geodatabase;
using ESRI.ArcGIS.esriSystem;
using ESRI.ArcGIS.NetworkAnalysis;
using ESRI.ArcGIS.EditorExt;
using ESRI.ArcGIS.Framework;
using System.IO;



namespace NetworkExplorer
{
    public partial class DoTrace : Form, IComparer
    {
        private Dictionary<int, int> _pathHash = null;
        private INetwork _network = null;
        private IGeometricNetwork _geomNet = null;
        private IFeatureClass _dynProtFC = null;
        private INetworkAnalysisExt _netAnalExt = null;

        public DoTrace(IApplication appRef)
        {
            InitializeComponent();

            _netAnalExt = (INetworkAnalysisExt) appRef.FindExtensionByName("Utility Network Analyst");

        }
        /// <summary>
        /// 
        /// </summary>
        /// <param name="circBreaker"></param>
        private void TraceFeeder(INetworkFeature circBreaker)
        {


            #region Initialize some variables

            listView1.Items.Clear();
            Int32 phaseABit = (int) Math.Pow(2, 28); // 268435456
            Int32 phaseBBit = (int) Math.Pow(2, 29); // 536870912
            Int32 phaseCBit = (int) Math.Pow(2, 30); // 1073741824

            #endregion

            #region Create a queue of junctions to visit and a hash table for path information

            Queue<int> junctionsToVisit = new Queue<int>();
            Dictionary<int, int> pathHash = new Dictionary<int, int>();
            int startEID = ((ISimpleJunctionFeature) circBreaker).EID;
            junctionsToVisit.Enqueue(startEID);
            pathHash.Add(startEID, -99999999);

            #endregion

            #region Get the MMElectricTraceWeight and create a ForwardStar so that we can stop the trace when we reach an open point

            _network = circBreaker.GeometricNetwork.Network;
            _geomNet = circBreaker.GeometricNetwork;
            INetSchema netSchema = (INetSchema) _network;
            INetWeight mmElectricTraceWeight = netSchema.get_WeightByName("MMElectricTraceWeight");
            IForwardStarGEN fStar =
                (IForwardStarGEN) _network.CreateForwardStar(false, mmElectricTraceWeight, null, null, null);

            #endregion

            while (junctionsToVisit.Count > 0)
            {
                #region Orient the Forward Star at the current junction EID

                int eid = junctionsToVisit.Dequeue();
                int adjEdgeCount = 0;
                fStar.FindAdjacent(0, eid, out adjEdgeCount);

                #endregion

                #region Declare and initialize arrays to hold edges and junctions, weights, and orientations

                int[] adjJuncEIDS = new int[adjEdgeCount];
                object[] adjJuncWeights = new object[adjEdgeCount];
                int[] adjEdgeEIDS = new int[adjEdgeCount];
                object[] adjEdgeWeights = new object[adjEdgeCount];
                    // We don't use this, but we still have to declare the array
                bool[] adjRevOrientations = new bool[adjEdgeCount];
                    // We don't use this, but we still have to declare the array

                #endregion

                #region Query the adjacent junctions and edges (while we are at it, get the weights too)

                fStar.QueryAdjacentJunctions(ref adjJuncEIDS, ref adjJuncWeights);
                fStar.QueryAdjacentEdges(ref adjEdgeEIDS, ref adjRevOrientations, ref adjEdgeWeights);

                #endregion

                #region Loop through all of the connected edges

                for (int i = 0; i < adjEdgeCount; i++)
                {
                    #region Get the connected edge and junction

                    int connectedEdgeEID = -1*adjEdgeEIDS[i];
                    int oppositeJuncEID = adjJuncEIDS[i];

                    #endregion

                    #region Check to see if the adjacent junctions has already been added to the paths hashtable

                    if (pathHash.ContainsKey(oppositeJuncEID) == false)
                    {
                        #region Add the opposite junction and the connected edge to the paths hashtable

                        pathHash.Add(oppositeJuncEID, connectedEdgeEID);
                        pathHash.Add(connectedEdgeEID, eid);

                        #endregion

                        #region If the opposite junction is closed on at least one phase (A or B or C), then enque the opposite junction

                        Int32 juncWeight = System.Convert.ToInt32(adjJuncWeights[i]);
                        if ((juncWeight & phaseABit) == 0 || (juncWeight & phaseBBit) == 0 ||
                            (juncWeight & phaseCBit) == 0 || (juncWeight == 0))
                        {
                            junctionsToVisit.Enqueue(oppositeJuncEID);
                        }

                        #endregion
                    }

                    #endregion
                }

                #endregion
            }
            _pathHash = pathHash;
            PopulateListView(pathHash, _network, _geomNet);
        }
        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void DoTrace_Load(object sender, EventArgs e)
        {
            try
            {
                LoadCircuitBreakers();
            }
            catch (Exception ex)
            {

            }
        }
        private void LoadCircuitBreakers()
        {
            IFeatureLayer circBreakerLayer = GetFeatureLayerInMap("schneiderville.ARCFM.DynamicProtectiveDevice");
            _dynProtFC = circBreakerLayer.FeatureClass;
            IQueryFilter qf = new QueryFilterClass();
            qf.WhereClause = "SUBTYPE = 1";
            IFeatureCursor feCur = circBreakerLayer.Search(qf, false);
            IFeature circBreaker = feCur.NextFeature() ;
            while (circBreaker != null)
            {
                comboBox1.Items.Add(circBreaker.get_Value(circBreaker.Fields.FindField("FEEDERID")));
                circBreaker = feCur.NextFeature();
            }
            Marshal.ReleaseComObject(feCur);
        }
        private IApplication GetAppRef()
        {
            // Get the actual underlying COM type
            Type t = Type.GetTypeFromCLSID(typeof(AppRefClass).GUID);
            // Or if ProgID or CLSID is known, use it directly
            //Type t = Type.GetTypeFromProgID("esriFramework.AppRef");
            //Type t = Type.GetTypeFromCLSID(new Guid("e1740ec5-9513-11d2-a2df-0000f8774fb5"));
            System.Object obj = Activator.CreateInstance(t);
            IApplication app = obj as IApplication;
            return app;
        }
        private IFeatureLayer GetFeatureLayerInMap(string dataSetName)
        {
            try
            {
                IMap focusMap = (GetAppRef().Document as ESRI.ArcGIS.ArcMapUI.IMxDocument).FocusMap;
                //ArcGISRuntimeEnvironment rte = new  ArcGISRuntimeEnvironment();
                //IMap focusMap = rte.FocusMap;
                UIDClass uid = new UIDClass();
                uid.Value = "{E156D7E5-22AF-11D3-9F99-00C04F6BC78E}";
                IEnumLayer enumLayer = focusMap.get_Layers(uid, true);
                enumLayer.Reset();
                IFeatureLayer fl = (IFeatureLayer)enumLayer.Next();
                while (fl != null)
                {
                    //MessageBox.Show(fl.Name);
                    IDataset ds = (IDataset)fl.FeatureClass;
                    //MessageBox.Show(ds.Name);
                    if (ds.Name.ToUpper() == dataSetName.ToUpper())
                    {
                        return fl;
                    }
                    fl = (IFeatureLayer)enumLayer.Next();
                }
                throw new ApplicationException("Layer " + dataSetName + " not found in focus map");
            }
            catch (Exception ex)
            {
                throw (ex);
            }

        }
        /// <summary>
        /// 
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void comboBox1_SelectedIndexChanged(object sender, EventArgs e)
        {
            this.Cursor = Cursors.WaitCursor;
            IQueryFilter qf = new QueryFilterClass();
            qf.WhereClause = "SUBTYPE  = 1 AND FEEDERID = '" + comboBox1.Text + "'";
            IFeatureCursor feCur = _dynProtFC.Search(qf, false);
            INetworkFeature circBreaker = feCur.NextFeature() as INetworkFeature;
            TraceFeeder(circBreaker);
            this.Cursor = Cursors.Arrow;
        }
        private void PopulateListView(Dictionary<int, int> pathDictionary, INetwork network, IGeometricNetwork geomNet)
        {
            IEnumNetEID netJuncEIDS = GetEnumNetEID(-1, pathDictionary, network, geomNet, esriElementType.esriETJunction);
            IEnumNetEID netEdgeEIDS = GetEnumNetEID(-1, pathDictionary, network, geomNet, esriElementType.esriETEdge);
            Dictionary<IFeature, int>   junctionsInPath = GetFeaturesFromNetEID(_geomNet, (IEnumNetEIDBuilder) netJuncEIDS);
            Dictionary<IFeature, int> edgesInPath = GetFeaturesFromNetEID(_geomNet, (IEnumNetEIDBuilder)netEdgeEIDS);
            
            //GetFeaturesFromNetEID(_geomNet, (IEnumNetEIDBuilder)netJuncEIDS);
            //GetFeaturesFromNetEID(_geomNet, (IEnumNetEIDBuilder)netEdgeEIDS);
            AddToListView(junctionsInPath);
        }
        private void AddToListView(Dictionary<IFeature, int> featuresInPath)
        {
            int counter = 0;
            foreach (KeyValuePair<IFeature,int> kvp in featuresInPath)
            {
                counter++;
                IDataset ds = (IDataset)kvp.Key.Class;
                ListViewItem lvi = listView1.Items.Add(ds.Name);
                lvi.SubItems.Add(kvp.Key.OID.ToString());
                lvi.SubItems.Add(kvp.Value.ToString());
                lvi.SubItems.Add(counter.ToString());
            }
        }
        private IEnumNetEID GetEnumNetEID(int eidToStartFrom, Dictionary<int, int> pathDictionary, INetwork network, IGeometricNetwork geomNet, esriElementType elemType)
        {
            IEnumNetEIDBuilder enumEIDBuilder = new EnumNetEIDArrayClass();
            enumEIDBuilder.Network = network;
            enumEIDBuilder.ElementType = elemType;
            if (eidToStartFrom == -1)//Add all elements to the return dictionary
            {
                foreach (KeyValuePair<int, int> kvp in pathDictionary)
                {
                    int eid = kvp.Key;
                    //Only add to the builder if the element type (junction or edge) is of the type we are looking for 
                    if (((eid < 0) && elemType == esriElementType.esriETEdge) || ((eid > 0) && elemType == esriElementType.esriETJunction))
                    {
                        enumEIDBuilder.Add(Math.Abs( eid));
                    }
                }
            }
            else
            {
                int eid = eidToStartFrom;
                while (eid != -99999999) // -99999999 means that there is no parent
                {
                    if (((eid < 0) && elemType == esriElementType.esriETEdge) || ((eid > 0) && elemType == esriElementType.esriETJunction))
                    {
                        enumEIDBuilder.Add(Math.Abs( eid));
                    }
                    //Get the junction or edge that feeds this junction or edge
                    eid = pathDictionary[eid];
                }
            }
            return   enumEIDBuilder as IEnumNetEID;
        }

        private static Dictionary<IFeature, int> GetFeaturesFromNetEID(IGeometricNetwork geomNet, IEnumNetEIDBuilder enumEIDBuilder)
        {
            string fileName = "eidGeomLines.txt";
            if (((IEnumNetEID)enumEIDBuilder).ElementType == esriElementType.esriETJunction)
            {
                fileName = "eidGeomPoints.txt";
            }
            Dictionary<IFeature, int> featuresInPath = new Dictionary<IFeature, int>();
            using (System.IO.StreamWriter sw = System.IO.File.CreateText("C:\\temp\\" + fileName))
            {
                sw.Write("[");
                
                IEIDHelper eidHelper = new EIDHelperClass();
                //eidHelper.AddField("OBJECTID");
                //eidHelper.AddField("SHAPE");
                eidHelper.ReturnGeometries = true;
                int multiplier = 1;
                if (((IEnumNetEID)enumEIDBuilder).ElementType == esriElementType.esriETEdge)
                {
                    multiplier = -1;
                }
                eidHelper.ReturnFeatures = true;
                eidHelper.GeometricNetwork = geomNet;
                IEnumEIDInfo enumEIDInfo = eidHelper.CreateEnumEIDInfo(enumEIDBuilder as IEnumNetEID);
                enumEIDInfo.Reset();
                for (int i = 0; i < enumEIDInfo.Count; i++)
                {
                    IEIDInfo eidInfo = enumEIDInfo.Next();
                    try
                    {
                        IFeature fe = eidInfo.Feature;
                        int eid = eidInfo.EID;
                        featuresInPath.Add(fe, eidInfo.EID);
                        sw.Write("[");
                        sw.Write(eid * multiplier);
                        sw.Write(",");
                        sw.Write("[");
                        if (fe.Shape.GeometryType == esriGeometryType.esriGeometryPolyline)
                        {
                            #region Loop through the point collection of the polyline and write out to the file
                            IPointCollection pc = fe.Shape as IPointCollection;
                            for (int j = 0; j < pc.PointCount; j++)
                            {
                                sw.Write("[");
                                sw.Write(pc.get_Point(j).X + "," + pc.get_Point(j).Y);
                                sw.Write("]");
                                if (j + 1 < pc.PointCount)
                                {
                                    sw.Write("],");
                                }
                            }
                            #endregion
                        }
                        else if (fe.Shape.GeometryType == esriGeometryType.esriGeometryPoint)
                        {
                            IPoint pnt = fe.Shape as IPoint;
                            sw.Write(pnt.X.ToString() + "," + pnt.Y.ToString());
                            sw.Write("]");
                        }
                        if (i + 1 < enumEIDInfo.Count)
                        {
                            sw.Write(",");//more geometries coming!
                        }
                    }
                    catch { }
                }
                sw.Write("]"); // This closes off all the geoemtries
                sw.Close();
            }

            return featuresInPath;
        }
        public  void SetResults(IEnumNetEID edgeEnumNetEID, IEnumNetEID juncEnumNetEID, bool asSelection, INetworkAnalysisExt netAnalExt, Color namedColor)
        {
                INetworkAnalysisExtResults netAnalResults = (INetworkAnalysisExtResults)_netAnalExt;
                IRgbColor rgbColor = new RgbColorClass();
                rgbColor.Red = namedColor.R;
                rgbColor.Blue = namedColor.B;
                rgbColor.Green = namedColor.G;
                netAnalResults.ResultsAsSelection = asSelection;
                netAnalResults.DrawComplex = true;
                INetworkAnalysisExtResultColor netAnalColor = (INetworkAnalysisExtResultColor)netAnalExt;
                netAnalColor.Color = rgbColor;
                netAnalResults.SetResults(juncEnumNetEID, edgeEnumNetEID);
        }
        private void listView1_SelectedIndexChanged(object sender, EventArgs e)
        {
            try
            {
                if (listView1.SelectedItems.Count == 0) { return; }
                this.Cursor = Cursors.WaitCursor;
                int eidToStartFrom = (int)System.Convert.ToInt32(listView1.SelectedItems[0].SubItems[2].Text);
                IEnumNetEID edges = GetEnumNetEID(eidToStartFrom, _pathHash ,_network, _geomNet, esriElementType.esriETEdge);
                IEnumNetEID juncs = GetEnumNetEID(eidToStartFrom, _pathHash, _network, _geomNet, esriElementType.esriETJunction);
                SetResults(edges, juncs, true, _netAnalExt, Color.Red);
                this.Cursor = Cursors.Arrow;
            }
            catch (Exception ex) { MessageBox.Show(ex.ToString()); }
        }
        int _columnIndex = 0;
        private void listView1_ColumnClick(object sender, ColumnClickEventArgs e)
        {
            _columnIndex = e.Column;
            listView1.ListViewItemSorter = this;
            listView1.Sort();
        }
        int IComparer.Compare(object x, object y)
        {
            ListViewItem lvi1 = x as ListViewItem;
            ListViewItem lvi2 = y as ListViewItem;
            if (lvi1.SubItems.Count < 4) { return 0; }
            if (lvi2.SubItems.Count < 4) { return 0; }
            if(_columnIndex > 0)
            {
                int num1 = System.Convert.ToInt32(lvi1.SubItems[_columnIndex].Text);
                int num2 = System.Convert.ToInt32(lvi2.SubItems[_columnIndex].Text);
                if (num1 < num2) { return -1; }
                if (num1 == num2) { return 0; }
                return 1;
            }
            else
            {
                return lvi1.SubItems[_columnIndex].Text.CompareTo(lvi2.SubItems[_columnIndex].Text);
            }   
        }
    }
}