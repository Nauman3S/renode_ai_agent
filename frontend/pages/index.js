import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import ReactLoading from "react-loading";
import { motion, AnimatePresence } from "framer-motion";
import { Tab } from '@headlessui/react'
import toast, { Toaster } from 'react-hot-toast'
import SettingsModal from '../components/SettingsModal'
import AIChatTab from '../components/AIChatTab'
import ContextSelector from '../components/ContextSelector'

export default function Home() {
    const [replFile, setReplFile] = useState(null);
    const [rescFile, setRescFile] = useState(null);
    const [elfFile, setElfFile] = useState(null);
    const [logs, setLogs] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState("");
    const [fileContent, setFileContent] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('main');
    const [aiContext, setAiContext] = useState(null);
    const [selectedContexts, setSelectedContexts] = useState(['opened_content']);

    const handleUpload = async () => {
        if (!replFile || !rescFile || !elfFile) {
            alert("Please select all files!");
            return;
        }

        try {
            setSelectedFile(null); // Hide file editor
            setIsLoading(true); // Show loading animation
            console.log("Starting upload...");
            const formData = new FormData();
            formData.append("repl_file", replFile);
            formData.append("resc_file", rescFile);
            formData.append("elf_file", elfFile);

            const response = await fetch("http://localhost:9001/upload/", {
                method: "POST",
                body: formData,
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors',
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log("Upload result:", result);
            
            if (result.log_file) {
                await fetchLogs();
            }
        } catch (error) {
            console.error("Error during upload:", error);
            alert("Error during upload: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const response = await fetch("http://localhost:9001/logs/");
            const data = await response.json();
            setLogs(data.logs.join("\n"));
        } catch (error) {
            console.error("Error fetching logs:", error);
            setLogs("Error fetching logs: " + error.message);
        }
    };

    const handleFileClick = async (file, type) => {
        if (type === 'elf') {
            setSelectedFile({ name: file.name, content: "Binary file content cannot be displayed", type });
            setFileContent("Binary file content cannot be displayed");
            return;
        }

        try {
            const content = await file.text();
            setSelectedFile({ name: file.name, content, type });
            setFileContent(content);
        } catch (error) {
            console.error("Error reading file:", error);
            setSelectedFile({ name: file.name, content: "Error reading file", type });
            setFileContent("Error reading file");
        }
    };

    const getAvailableFiles = () => {
        const files = [];
        if (replFile) files.push({ id: 'repl', name: replFile.name, content: replFile });
        if (rescFile) files.push({ id: 'resc', name: rescFile.name, content: rescFile });
        return files;
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        try {
            // Get the current context
            let contextContent = '';
            if (selectedContexts.includes('opened_content')) {
                contextContent = selectedFile 
                    ? `File ${selectedFile.name}:\n${selectedFile.content}\n\n`
                    : `Execution Logs:\n${logs}\n\n`;
            } else {
                for (const contextId of selectedContexts) {
                    if (contextId === 'logs') {
                        contextContent += `Execution Logs:\n${logs}\n\n`;
                    } else {
                        const file = getAvailableFiles().find(f => f.id === contextId);
                        if (file?.content) {
                            const content = await file.content.text();
                            contextContent += `File ${file.name}:\n${content}\n\n`;
                        }
                    }
                }
            }

            // Set the context and message
            setAiContext({
                context: contextContent,
                message: message.trim(),
                timestamp: new Date().toISOString() // Add timestamp to force update
            });

            // Clear the message input and switch to AI tab
            setMessage('');
            setActiveTab('ai');
        } catch (error) {
            console.error('Error processing message:', error);
            // Handle error (maybe show a toast notification)
        }
    };

    const getEditorLanguage = (type) => {
        switch (type) {
            case 'repl':
                return 'plaintext';
            case 'resc':
                return 'shell';
            default:
                return 'plaintext';
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-gray-800 p-4 flex flex-col relative">
                <h2 className="text-xl font-bold mb-4">Files</h2>
                
                {/* Upload Section */}
                <div className="space-y-4 mb-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Platform Description (.repl)</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="file"
                                onChange={(e) => setReplFile(e.target.files[0])}
                                accept=".repl"
                                className="hidden"
                                id="repl-upload"
                            />
                            <label
                                htmlFor="repl-upload"
                                className="px-3 py-2 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600 text-sm"
                            >
                                Choose File
                            </label>
                            <span className="text-sm truncate">
                                {replFile ? replFile.name : "No file chosen"}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">Script File (.resc)</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="file"
                                onChange={(e) => setRescFile(e.target.files[0])}
                                accept=".resc"
                                className="hidden"
                                id="resc-upload"
                            />
                            <label
                                htmlFor="resc-upload"
                                className="px-3 py-2 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600 text-sm"
                            >
                                Choose File
                            </label>
                            <span className="text-sm truncate">
                                {rescFile ? rescFile.name : "No file chosen"}
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-300">ELF Binary (.elf)</label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="file"
                                onChange={(e) => setElfFile(e.target.files[0])}
                                accept=".elf"
                                className="hidden"
                                id="elf-upload"
                            />
                            <label
                                htmlFor="elf-upload"
                                className="px-3 py-2 bg-gray-700 rounded-md cursor-pointer hover:bg-gray-600 text-sm"
                            >
                                Choose File
                            </label>
                            <span className="text-sm truncate">
                                {elfFile ? elfFile.name : "No file chosen"}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleUpload}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Upload & Run
                    </button>
                </div>

                {/* File List */}
                <div className="flex-1 overflow-y-auto">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Uploaded Files</h3>
                    <ul className="space-y-2">
                        {replFile && (
                            <li
                                onClick={() => handleFileClick(replFile, 'repl')}
                                className="cursor-pointer p-2 rounded hover:bg-gray-700"
                            >
                                📄 {replFile.name}
                            </li>
                        )}
                        {rescFile && (
                            <li
                                onClick={() => handleFileClick(rescFile, 'resc')}
                                className="cursor-pointer p-2 rounded hover:bg-gray-700"
                            >
                                📄 {rescFile.name}
                            </li>
                        )}
                        {elfFile && (
                            <li
                                onClick={() => handleFileClick(elfFile, 'elf')}
                                className="cursor-pointer p-2 rounded hover:bg-gray-700"
                            >
                                📄 {elfFile.name}
                            </li>
                        )}
                    </ul>
                </div>
                <SettingsModal />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen">
                {/* Content Area */}
                <div className="flex-1 p-6 overflow-hidden">
                    <Tab.Group selectedIndex={activeTab === 'main' ? 0 : 1} onChange={index => setActiveTab(index === 0 ? 'main' : 'ai')}>
                        <Tab.List className="flex space-x-2 mb-4">
                            <Tab className={({ selected }) =>
                                `px-4 py-2 rounded-lg ${
                                    selected 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`
                            }>
                                Main
                            </Tab>
                            <Tab className={({ selected }) =>
                                `px-4 py-2 rounded-lg ${
                                    selected 
                                        ? 'bg-blue-600 text-white' 
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`
                            }>
                                AI Agent
                            </Tab>
                        </Tab.List>

                        <Tab.Panels className="flex-1 h-[calc(100vh-12rem)]">
                            <Tab.Panel className="h-full">
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 bg-opacity-90 z-50"
                                        >
                                            <ReactLoading type="cylon" color="#60A5FA" />
                                            <motion.div
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                transition={{ delay: 0.2 }}
                                                className="mt-4 text-blue-400 font-semibold"
                                            >
                                                Processing Files...
                                            </motion.div>
                                        </motion.div>
                                    ) : selectedFile ? (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="h-full bg-gray-800 rounded-lg p-4 flex flex-col"
                                        >
                                            <div className="flex justify-between items-center mb-4">
                                                <h2 className="text-xl font-bold">{selectedFile.name}</h2>
                                                <button 
                                                    onClick={() => setSelectedFile(null)}
                                                    className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-all duration-200"
                                                >
                                                    Close
                                                </button>
                                            </div>
                                            {selectedFile.type === 'elf' ? (
                                                <div className="flex-1 bg-gray-900 p-4 rounded overflow-auto">
                                                    {selectedFile.content}
                                                </div>
                                            ) : (
                                                <div className="flex-1 min-h-0">
                                                    <Editor
                                                        height="100%"
                                                        defaultLanguage={getEditorLanguage(selectedFile.type)}
                                                        defaultValue={selectedFile.content}
                                                        theme="vs-dark"
                                                        options={{
                                                            readOnly: true,
                                                            minimap: { enabled: true },
                                                            scrollBeyondLastLine: false,
                                                            fontSize: 14,
                                                            lineNumbers: "on",
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -20 }}
                                            className="h-full bg-gray-800 rounded-lg p-4 overflow-auto"
                                        >
                                            <h2 className="text-xl font-bold mb-4">Execution Logs</h2>
                                            <pre className="whitespace-pre-wrap font-mono text-sm overflow-x-auto bg-gray-900 p-4 rounded">
                                                {logs || "No logs available"}
                                            </pre>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Tab.Panel>
                            <Tab.Panel className="h-full">
                                <AIChatTab aiContext={aiContext} />
                            </Tab.Panel>
                        </Tab.Panels>
                    </Tab.Group>
                </div>

                {/* Chat Input */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 border-t border-gray-700"
                >
                    <ContextSelector
                        files={getAvailableFiles()}
                        logs={logs}
                        selectedContexts={selectedContexts}
                        setSelectedContexts={setSelectedContexts}
                    />
                    <form onSubmit={handleSendMessage} className="flex space-x-4">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message..."
                            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Send
                        </button>
                    </form>
                </motion.div>
            </div>
            <Toaster position="top-right" />
        </div>
    );
}
