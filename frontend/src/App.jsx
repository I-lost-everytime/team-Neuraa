import React, { useState, useEffect } from 'react';
import { AptosClient } from 'https://esm.sh/aptos@1.17.0';

// Configuration
const MODULE_ADDRESS = '0x9be54afa644bde0f34ec4284268ea050f8432e6ad17c65548610a01d612da398';
const MODULE_NAME = 'landregistry';
const FULL_MODULE = `${MODULE_ADDRESS}::${MODULE_NAME}`;
const TESTNET_URL = 'https://fullnode.testnet.aptoslabs.com/v1';
const API_BASE_URL = 'http://localhost:5000/api';

const ROLE_MAP = { 0: 'None', 1: 'Patwari', 2: 'Tehsildar', 3: 'DLR' };
const STATUS_MAP = { 1: 'Provisional', 2: 'Approved', 3: 'Finalized', 99: 'Disputed' };

const client = new AptosClient(TESTNET_URL);

// Toast Component
const Toast = ({ message, isError, onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`fixed bottom-6 right-6 px-6 py-4 rounded shadow-lg text-white font-semibold z-50 ${isError ? 'bg-red-600' : 'bg-green-600'}`}>
      {message}
    </div>
  );
};

// File Upload Component
const FileUpload = ({ walletAddress, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');

  const handleFileUpload = async () => {
    if (!file || !walletAddress) {
      setUploadResult('Please select a file and connect wallet');
      return;
    }

    setUploading(true);
    setUploadResult('Uploading to IPFS...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('wallet_address', walletAddress);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadResult(`✓ SUCCESS - CID: ${data.cid}`);
        onUploadSuccess(data);
      } else {
        setUploadResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setUploadResult(`Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white rounded border border-gray-300 p-5">
      <h3 className="text-base font-bold text-gray-800 mb-4">Upload Document to IPFS</h3>
      <div className="space-y-3">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
        />
        <button
          onClick={handleFileUpload}
          disabled={uploading || !file}
          className="w-full py-3 bg-indigo-700 hover:bg-indigo-800 text-white text-sm font-semibold rounded shadow disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload to IPFS'}
        </button>
        {uploadResult && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono">
            {uploadResult}
          </div>
        )}
      </div>
    </div>
  );
};

// Get available tabs based on user role
const getAvailableTabs = (userRole) => {
  const tabs = [];
  
  tabs.push({ id: 'upload', label: 'Upload to IPFS', icon: '📤' });
  tabs.push({ id: 'explorer', label: 'Search Records', icon: '🔍' });
  tabs.push({ id: 'history', label: 'My Properties', icon: '📋' });
  
  if (userRole >= 1) {
    tabs.unshift({ id: 'register', label: 'Register Land', icon: '📝' });
  }
  
  if (userRole >= 2) {
    tabs.push({ id: 'approve', label: 'Approve Land', icon: '✅' });
  }
  
  if (userRole >= 3) {
    tabs.push({ id: 'finalize', label: 'Finalize Land', icon: '🏛️' });
    tabs.push({ id: 'admin', label: 'Role Management', icon: '⚙️' });
  }
  
  tabs.push({ id: 'transfer', label: 'Transfer Ownership', icon: '🔄' });
  
  return tabs;
};

export default function LandRegistryApp() {
  const [wallet, setWallet] = useState(null);
  const [userRole, setUserRole] = useState(0);
  const [activeTab, setActiveTab] = useState('upload');
  const [toast, setToast] = useState({ message: '', isError: false });
  const [myLands, setMyLands] = useState([]);
  const [availableTabs, setAvailableTabs] = useState([]);

  const [regOwner, setRegOwner] = useState('');
  const [regCoords, setRegCoords] = useState('');
  const [regDoc, setRegDoc] = useState('');
  const [regArea, setRegArea] = useState('');
  const [approveId, setApproveId] = useState('');
  const [finalizeId, setFinalizeId] = useState('');
  const [transferId, setTransferId] = useState('');
  const [transferNewOwner, setTransferNewOwner] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [adminRole, setAdminRole] = useState('1');
  const [explorerId, setExplorerId] = useState('');
  const [explorerResult, setExplorerResult] = useState(null);

  const [registerResult, setRegisterResult] = useState('Awaiting transaction submission...');
  const [approveResult, setApproveResult] = useState('Awaiting transaction submission...');
  const [finalizeResult, setFinalizeResult] = useState('Awaiting transaction submission...');
  const [transferResult, setTransferResult] = useState('Awaiting transaction submission...');
  const [adminResult, setAdminResult] = useState('Awaiting transaction submission...');

  useEffect(() => {
    const tabs = getAvailableTabs(userRole);
    setAvailableTabs(tabs);
    
    if (tabs.length > 0 && !tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [userRole]);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
  };

  const isValidAddr = (addr) => /^0x[0-9a-fA-F]{64}$/.test(addr);

  const getRole = async (addr) => {
    try {
      const res = await client.view({
        function: `${FULL_MODULE}::get_user_role`,
        type_arguments: [],
        arguments: [addr],
      });
      return parseInt(res[0], 10);
    } catch {
      return 0;
    }
  };

  const connectWallet = async () => {
    if (!window.aptos) {
      showToast('Please install Petra or Martian wallet extension!', true);
      return;
    }

    try {
      const res = await window.aptos.connect();
      setWallet(res.address);
      const role = await getRole(res.address);
      setUserRole(role);
      showToast(`Connected as ${ROLE_MAP[role]}`);
      
      fetchMyLands(res.address);
    } catch (err) {
      console.error(err);
      showToast('Wallet connection failed', true);
    }
  };

  const fetchMyLands = async (address) => {
    try {
      const response = await fetch(`${API_BASE_URL}/lands/${address}`);
      const data = await response.json();
      setMyLands(data);
    } catch (err) {
      console.error('Failed to fetch lands:', err);
    }
  };

  const txn = async (fn, args, setResult) => {
    if (!window.aptos || !wallet) {
      showToast('Please connect your wallet first', true);
      return;
    }

    setResult('<div class="flex items-center gap-2"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div> Submitting transaction...</div>');

    try {
      const tx = {
        type: 'entry_function_payload',
        function: `${FULL_MODULE}::${fn}`,
        type_arguments: [],
        arguments: args,
      };

      const pending = await window.aptos.signAndSubmitTransaction(tx);
      setResult(`<div class="flex items-center gap-2"><div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div> Confirming: ${pending.hash.substring(0, 12)}...</div>`);
      showToast('Transaction submitted successfully!');

      const confirmed = await client.waitForTransactionWithResult(pending.hash);

      if (confirmed.success) {
        setResult(`<span class="text-green-700 font-bold">✓ SUCCESS</span><br/><a href="https://explorer.aptoslabs.com/txn/${pending.hash}?network=testnet" target="_blank" class="text-blue-700 hover:underline text-xs">${pending.hash.substring(0, 20)}... View on Explorer →</a>`);
        showToast('Transaction confirmed successfully!');
      } else {
        setResult(`Transaction failed: ${confirmed.vm_status}`);
        showToast('Transaction failed', true);
      }
    } catch (err) {
      console.error(err);
      setResult(`Error: ${err.message || err.toString()}`);
      showToast('Transaction error occurred', true);
    }
  };

  const handleRegister = async () => {
    if (!isValidAddr(regOwner)) return showToast('Invalid owner address format', true);
    if (!regCoords || !regDoc || !regArea) return showToast('Please fill all required fields', true);
    await txn('register_land', [regOwner, regCoords, regDoc, regArea], setRegisterResult);
  };

  const handleApprove = async () => {
    if (!approveId || approveId <= 0) return showToast('Invalid Land ID', true);
    await txn('approve_land', [approveId], setApproveResult);
  };

  const handleFinalize = async () => {
    if (!finalizeId || finalizeId <= 0) return showToast('Invalid Land ID', true);
    await txn('finalize_land', [finalizeId], setFinalizeResult);
  };

  const handleTransfer = async () => {
    if (!transferId || transferId <= 0) return showToast('Invalid Land ID', true);
    if (!isValidAddr(transferNewOwner)) return showToast('Invalid new owner address format', true);
    await txn('transfer_land', [transferId, transferNewOwner], setTransferResult);
  };

  const handleAssignRole = async () => {
    if (!isValidAddr(adminAddress)) return showToast('Invalid address format', true);
    await txn('assign_role', [adminAddress, adminRole], setAdminResult);
  };

  const handleExplore = async () => {
    if (!explorerId || explorerId <= 0) return showToast('Invalid Land ID', true);
    
    setExplorerResult({ loading: true });

    try {
      const res = await client.view({
        function: `${FULL_MODULE}::get_land_details`,
        type_arguments: [],
        arguments: [explorerId],
      });

      setExplorerResult({ data: res[0] });
      showToast(`Land record #${explorerId} retrieved successfully`);
    } catch (err) {
      console.error(err);
      setExplorerResult({ error: err.message });
      showToast('Failed to retrieve land record', true);
    }
  };

  const handleUploadSuccess = (uploadData) => {
    showToast('File uploaded successfully! You can now use the CID in land registration.');
    if (activeTab === 'register') {
      setRegDoc(uploadData.cid);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet" />
      
      <div className="h-2" style={{ background: 'linear-gradient(to right, #FF9933 0%, #FF9933 33.33%, #FFFFFF 33.33%, #FFFFFF 66.66%, #138808 66.66%, #138808 100%)' }}></div>

      <header className="bg-white border-b-2 border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center text-white font-bold shadow">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Digital Land Registry Portal</h1>
                <p className="text-sm text-gray-600">Government of India | भारत सरकार</p>
                <p className="text-xs text-gray-500">Department of Land Resources</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-blue-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="hover:text-blue-700 cursor-pointer">Home</span> / 
              <span className="hover:text-blue-700 cursor-pointer"> Services</span> / 
              <span className="font-semibold text-gray-800"> Land Registry</span>
            </div>
            {!wallet ? (
              <button
                onClick={connectWallet}
                className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded shadow"
              >
                Connect Digital Wallet
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded border border-gray-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="text-sm">
                  <p className="text-xs text-gray-500">Connected</p>
                  <p className="font-semibold text-gray-800">{`${wallet.substring(0, 6)}...${wallet.slice(-4)}`}</p>
                  <p className="text-xs font-medium text-blue-700">Role: {ROLE_MAP[userRole]}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-700" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-yellow-800">Important Notice</h3>
              <p className="text-sm text-yellow-700 mt-1">This is a blockchain-based testnet deployment. Always verify transaction details before signing.</p>
            </div>
          </div>
        </div>

        {wallet && (
          <div className={`p-4 mb-6 rounded border-l-4 ${
            userRole === 0 ? 'bg-red-50 border-red-400' :
            userRole === 1 ? 'bg-green-50 border-green-400' :
            userRole === 2 ? 'bg-blue-50 border-blue-400' :
            'bg-purple-50 border-purple-400'
          }`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">{userRole === 3 ? '👑' : userRole === 2 ? '✅' : userRole === 1 ? '📝' : '👤'}</div>
              <div>
                <p className="font-semibold text-gray-800">
                  {userRole === 0 && 'No Role Assigned'}
                  {userRole === 1 && 'Patwari Access - You can register new land parcels'}
                  {userRole === 2 && 'Tehsildar Access - You can register and approve land parcels'}
                  {userRole === 3 && 'DLR Access - Full administrative privileges granted'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Available actions are shown in tabs below based on your role
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded border border-gray-300 p-5 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">System Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="border border-gray-200 rounded p-3 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1 font-semibold">Smart Contract Address</p>
              <p className="font-mono text-xs text-gray-800 break-all">{MODULE_ADDRESS}</p>
            </div>
            <div className="border border-gray-200 rounded p-3 bg-gray-50">
              <p className="text-xs text-gray-500 mb-1 font-semibold">Network Status</p>
              <p className="text-xs font-semibold text-gray-800">Aptos Testnet</p>
              <a href="https://explorer.aptoslabs.com/?network=testnet" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 hover:underline">View on Explorer →</a>
            </div>
          </div>
        </div>

        {wallet && availableTabs.length > 0 && (
          <>
            <div className="bg-white rounded border border-gray-300 mb-6 overflow-hidden">
              <div className="flex overflow-x-auto">
                {availableTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-6 py-4 text-sm font-semibold border-r border-gray-200 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'bg-blue-700 text-white border-b-4 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {activeTab === 'register' && userRole >= 1 && (
                <div className="bg-white rounded border border-gray-300 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                    <div className="bg-green-100 p-2 rounded">
                      <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">Register New Land Parcel</h3>
                      <p className="text-xs text-gray-600">Authorized Personnel: Patwari</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Owner Wallet Address *</label>
                      <input
                        type="text"
                        value={regOwner}
                        onChange={(e) => setRegOwner(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Coordinates CID (IPFS) *</label>
                      <input
                        type="text"
                        value={regCoords}
                        onChange={(e) => setRegCoords(e.target.value)}
                        placeholder="QmXxx..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Document CID (IPFS) *</label>
                      <input
                        type="text"
                        value={regDoc}
                        onChange={(e) => setRegDoc(e.target.value)}
                        placeholder="QmXxx..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Area (Square Meters) *</label>
                      <input
                        type="number"
                        value={regArea}
                        onChange={(e) => setRegArea(e.target.value)}
                        placeholder="1000"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <button
                      onClick={handleRegister}
                      className="w-full py-3 bg-green-700 hover:bg-green-800 text-white text-sm font-semibold rounded shadow"
                    >
                      Submit Registration
                    </button>
                    <div
                      className="p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 min-h-[60px]"
                      dangerouslySetInnerHTML={{ __html: registerResult }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'approve' && userRole >= 2 && (
                <div className="bg-white rounded border border-gray-300 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                    <div className="bg-blue-100 p-2 rounded">
                      <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">Approve Land Registration</h3>
                      <p className="text-xs text-gray-600">Authorized Personnel: Tehsildar</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Land Record ID *</label>
                      <input
                        type="number"
                        value={approveId}
                        onChange={(e) => setApproveId(e.target.value)}
                        placeholder="Enter Land ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <button
                      onClick={handleApprove}
                      className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded shadow"
                    >
                      Approve Registration
                    </button>
                    <div
                      className="p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 min-h-[60px]"
                      dangerouslySetInnerHTML={{ __html: approveResult }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'finalize' && userRole >= 3 && (
                <div className="bg-white rounded border border-gray-300 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                    <div className="bg-purple-100 p-2 rounded">
                      <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">Finalize Land Record</h3>
                      <p className="text-xs text-gray-600">Authorized Personnel: DLR</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Land Record ID *</label>
                      <input
                        type="number"
                        value={finalizeId}
                        onChange={(e) => setFinalizeId(e.target.value)}
                        placeholder="Enter Land ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <button
                      onClick={handleFinalize}
                      className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold rounded shadow"
                    >
                      Finalize Record
                    </button>
                    <div
                      className="p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 min-h-[60px]"
                      dangerouslySetInnerHTML={{ __html: finalizeResult }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'transfer' && (
                <div className="bg-white rounded border border-gray-300 p-5">
                  <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                    <div className="bg-orange-100 p-2 rounded">
                      <svg className="w-5 h-5 text-orange-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-gray-800">Transfer Ownership</h3>
                      <p className="text-xs text-gray-600">Authorized: Property Owner</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Land Record ID *</label>
                      <input
                        type="number"
                        value={transferId}
                        onChange={(e) => setTransferId(e.target.value)}
                        placeholder="Enter Land ID"
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">New Owner Address *</label>
                      <input
                        type="text"
                        value={transferNewOwner}
                        onChange={(e) => setTransferNewOwner(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <button
                      onClick={handleTransfer}
                      className="w-full py-3 bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold rounded shadow"
                    >
                      Transfer Ownership
                    </button>
                    <div
                      className="p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 min-h-[60px]"
                      dangerouslySetInnerHTML={{ __html: transferResult }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'upload' && (
                <FileUpload walletAddress={wallet} onUploadSuccess={handleUploadSuccess} />
              )}

              {activeTab === 'explorer' && (
                <div className="bg-white rounded border border-gray-300 p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Search Land Records</h3>
                  <p className="text-sm text-gray-600 mb-5">Enter a valid Land ID to retrieve complete property details</p>
                  <div className="flex gap-3 mb-6">
                    <input
                      type="number"
                      value={explorerId}
                      onChange={(e) => setExplorerId(e.target.value)}
                      placeholder="Enter Land Record ID"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                    />
                    <button
                      onClick={handleExplore}
                      className="px-8 py-3 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded shadow"
                    >
                      Search
                    </button>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-6 min-h-[300px]">
                    {!explorerResult ? (
                      <p className="text-gray-500 text-sm text-center py-12">Enter a Land Record ID and click Search to view property details</p>
                    ) : explorerResult.loading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                      </div>
                    ) : explorerResult.error ? (
                      <p className="text-red-700 text-center py-12 text-sm">Land record not found or error occurred: {explorerResult.error}</p>
                    ) : (
                      <div>
                        <div className="border-b-2 border-gray-200 pb-4 mb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xl font-bold text-gray-800">Land Record #{explorerResult.data.land_id}</h4>
                              <p className="text-sm text-gray-600 mt-1">Official Property Documentation</p>
                            </div>
                            <span className={`inline-block px-3 py-1 rounded text-xs font-semibold ${
                              explorerResult.data.status === 1 ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
                              explorerResult.data.status === 2 ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                              explorerResult.data.status === 3 ? 'bg-green-100 text-green-800 border border-green-300' :
                              'bg-red-100 text-red-800 border border-red-300'
                            }`}>
                              {STATUS_MAP[explorerResult.data.status] || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2">PROPERTY OWNER</p>
                            <p className="text-sm font-mono break-all text-gray-800">{explorerResult.data.owner_wallet}</p>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2">LAND AREA</p>
                            <p className="text-lg font-bold text-gray-800">{explorerResult.data.area_sq_meters.toLocaleString()} m²</p>
                            <p className="text-xs text-gray-600">{(explorerResult.data.area_sq_meters * 0.000247105).toFixed(2)} acres</p>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2">COORDINATES (IPFS)</p>
                            <a href={`https://ipfs.io/ipfs/${explorerResult.data.coordinates_cid}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline break-all">{explorerResult.data.coordinates_cid}</a>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2">DOCUMENTS (IPFS)</p>
                            <a href={`https://ipfs.io/ipfs/${explorerResult.data.document_cid}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline break-all">{explorerResult.data.document_cid}</a>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2">LAST VERIFIED BY</p>
                            <p className="text-sm font-mono break-all text-gray-800">{explorerResult.data.last_verified_by}</p>
                          </div>
                          <div className="bg-gray-50 border border-gray-200 rounded p-4">
                            <p className="text-xs font-semibold text-gray-500 mb-2">LAST UPDATED</p>
                            <p className="text-sm text-gray-800">{new Date(explorerResult.data.last_updated_timestamp * 1000).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'admin' && userRole >= 3 && (
                <div className="bg-white rounded border border-gray-300 p-6">
                  <div className="border-l-4 border-red-500 bg-red-50 p-4 mb-5">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-700" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-semibold text-red-800">Restricted Access</h3>
                        <p className="text-sm text-red-700 mt-1">Role assignment is restricted to District Land Registrar (DLR) only</p>
                      </div>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">Role Management</h3>
                  <p className="text-sm text-gray-600 mb-5">Assign official roles to authorized personnel</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Official Wallet Address *</label>
                      <input
                        type="text"
                        value={adminAddress}
                        onChange={(e) => setAdminAddress(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Assign Role *</label>
                      <select
                        value={adminRole}
                        onChange={(e) => setAdminRole(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-600"
                      >
                        <option value="1">Patwari (Field Officer)</option>
                        <option value="2">Tehsildar (Approval Authority)</option>
                        <option value="3">DLR (District Land Registrar)</option>
                      </select>
                    </div>
                    <button
                      onClick={handleAssignRole}
                      className="w-full py-3 bg-red-700 hover:bg-red-800 text-white text-sm font-semibold rounded shadow"
                    >
                      Assign Role
                    </button>
                    <div
                      className="p-3 bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 min-h-[60px]"
                      dangerouslySetInnerHTML={{ __html: adminResult }}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'history' && (
                <div className="bg-white rounded border border-gray-300 p-6">
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">My Property Records</h3>
                      <p className="text-sm text-gray-600">View all documents uploaded under your wallet</p>
                    </div>
                    <button
                      onClick={() => fetchMyLands(wallet)}
                      className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded shadow"
                    >
                      Refresh
                    </button>
                  </div>
                  <div className="space-y-3 min-h-[300px]">
                    {myLands.length === 0 ? (
                      <p className="text-gray-500 text-sm text-center py-12">No documents found under your wallet</p>
                    ) : (
                      myLands.map((land) => (
                        <div key={land._id} className="bg-white border border-gray-300 rounded p-4 hover:border-blue-400 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-base font-bold text-gray-800">Document: {land.file_name}</p>
                              <p className="text-sm text-gray-600 mt-1">CID: {land.cid}</p>
                            </div>
                            <a
                              href={`https://ipfs.io/ipfs/${land.cid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded hover:bg-blue-200"
                            >
                              View on IPFS
                            </a>
                          </div>
                          <div className="bg-gray-50 p-2 rounded text-xs">
                            <p className="text-gray-500 font-semibold mb-1">Hex String Preview</p>
                            <p className="font-mono text-gray-700 truncate">{land.hex_string.substring(0, 100)}...</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!wallet && (
          <div className="bg-white rounded border border-gray-300 p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Wallet Connection Required</h3>
            <p className="text-gray-600 mb-6">Please connect your Aptos wallet to access the land registry portal</p>
            <button
              onClick={connectWallet}
              className="px-6 py-3 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded shadow"
            >
              Connect Wallet Now
            </button>
          </div>
        )}
      </div>

      <footer className="bg-gray-800 text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-bold mb-3">About This Portal</h4>
              <p className="text-gray-400">Blockchain-powered land registry system for transparent and secure property management.</p>
            </div>
            <div>
              <h4 className="font-bold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white">User Guide</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">Contact Support</h4>
              <p className="text-gray-400">Email: support@landregistry.gov.in</p>
              <p className="text-gray-400">Helpline: 1800-XXX-XXXX</p>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-6 pt-6 text-center text-sm text-gray-400">
            <p>© 2024 Government of India. All rights reserved. | Website content managed by Department of Land Resources</p>
          </div>
        </div>
      </footer>

      <Toast message={toast.message} isError={toast.isError} onClose={() => setToast({ message: '', isError: false })} />
    </div>
  );
}