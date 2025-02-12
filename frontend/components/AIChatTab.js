import { useState, useEffect, useRef } from 'react'
import ReactLoading from 'react-loading'
import { motion, AnimatePresence } from 'framer-motion'
import Editor from "@monaco-editor/react"
import { Dialog } from '@headlessui/react'
import { DocumentTextIcon } from '@heroicons/react/24/outline'

export default function AIChatTab({ aiContext }) {
    const [chatHistory, setChatHistory] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState(null)
    const [showContextModal, setShowContextModal] = useState(false)
    const [selectedContext, setSelectedContext] = useState(null)
    const [pendingMessage, setPendingMessage] = useState(null)
    const abortController = useRef(null)

    useEffect(() => {
        return () => {
            // Cleanup: abort any ongoing fetch when component unmounts
            if (abortController.current) {
                abortController.current.abort()
            }
        }
    }, [])

    useEffect(() => {
        if (aiContext?.message && aiContext?.context) {
            handleNewMessage(aiContext.message, aiContext.context);
        }
    }, [aiContext]);

    const processStream = async (reader, signal) => {
        const decoder = new TextDecoder()
        let partialResponse = ''

        try {
            while (true) {
                if (signal.aborted) {
                    throw new Error('Request aborted')
                }

                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value)
                const lines = chunk.split('\n')

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(5).trim()
                        
                        // Skip [DONE] message
                        if (data === '[DONE]') continue
                        
                        // Skip empty lines
                        if (!data) continue

                        try {
                            const parsed = JSON.parse(data)
                            const content = parsed.choices[0]?.delta?.content || ''
                            partialResponse += content

                            // Update the latest message in chat history with the partial response
                            setChatHistory(prev => {
                                const newHistory = [...prev]
                                if (newHistory.length > 0) {
                                    newHistory[newHistory.length - 1].response = partialResponse
                                }
                                return newHistory
                            })
                        } catch (e) {
                            console.log('Skipping invalid JSON:', data)
                            continue
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Fetch aborted')
            } else {
                throw error
            }
        }
    }

    const handleNewMessage = async (message, context) => {
        if (!message || !context) return

        // Abort any ongoing request
        if (abortController.current) {
            abortController.current.abort()
        }
        abortController.current = new AbortController()

        try {
            setIsLoading(true)
            const apiKey = localStorage.getItem('openai_api_key')
            if (!apiKey) {
                throw new Error('OpenAI API key not found. Please add it in settings.')
            }

            // Add new message to history immediately with empty response
            const newChat = {
                timestamp: new Date().toISOString(),
                context: context,
                userMessage: message,
                response: '',
                contextFiles: context.split('\n')
                    .filter(line => line.startsWith('File ') || line.startsWith('Execution Logs:'))
                    .map(line => line.startsWith('File ') ? line.split(':')[0].replace('File ', '') : 'Execution Logs')
            }
            setChatHistory(prev => [...prev, newChat])

            const messages = [
                {
                    role: 'system',
                    content: 'You are a helpful assistant analyzing code and logs.'
                },
                ...chatHistory.flatMap(chat => [
                    { role: 'user', content: `Context:\n${chat.context}\n\nQuestion: ${chat.userMessage}` },
                    { role: 'assistant', content: chat.response }
                ]),
                { role: 'user', content: `Context:\n${context}\n\nQuestion: ${message}` }
            ]

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Accept': 'text/event-stream',
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages,
                    stream: true
                }),
                signal: abortController.current.signal
            })

            if (!response.ok) {
                throw new Error('Failed to get AI response')
            }

            const reader = response.body.getReader()
            await processStream(reader, abortController.current.signal)

        } catch (err) {
            setError(err.message)
            // Remove the last message if there was an error
            setChatHistory(prev => prev.slice(0, -1))
        } finally {
            setIsLoading(false)
            setPendingMessage(null)
        }
    }

    useEffect(() => {
        if (pendingMessage) {
            handleNewMessage(pendingMessage.message, pendingMessage.context)
        }
    }, [pendingMessage])

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString()
    }

    if (isLoading && chatHistory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <ReactLoading type="cylon" color="#60A5FA" />
                <p className="mt-4 text-gray-400">Getting AI response...</p>
            </div>
        )
    }

    if (error && chatHistory.length === 0) {
        return (
            <div className="p-4 bg-red-900/20 rounded-lg">
                <p className="text-red-400">{error}</p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col space-y-4 overflow-auto p-4">
            {chatHistory.map((chat, index) => (
                <div key={chat.timestamp} className="space-y-4">
                    {/* User Message */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gray-800 rounded-lg p-4"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-sm text-gray-400">
                                {formatTimestamp(chat.timestamp)}
                            </span>
                            <button
                                onClick={() => {
                                    setSelectedContext(chat.context)
                                    setShowContextModal(true)
                                }}
                                className="flex items-center text-sm text-blue-400 hover:text-blue-300"
                            >
                                <DocumentTextIcon className="h-4 w-4 mr-1" />
                                View Context: {chat.contextFiles.join(', ')}
                            </button>
                        </div>
                        <div className="font-medium text-gray-200">
                            {chat.userMessage}
                        </div>
                    </motion.div>

                    {/* AI Response */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gray-700/50 rounded-lg p-4 ml-8"
                    >
                        <Editor
                            height="200px"
                            defaultLanguage="markdown"
                            value={chat.response || 'Loading...'}
                            theme="vs-dark"
                            options={{
                                readOnly: true,
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                fontSize: 14,
                                lineNumbers: "off",
                                wordWrap: "on",
                                contextmenu: false,
                                lineDecorationsWidth: 0,
                                lineNumbersMinChars: 0,
                                overviewRulerBorder: false,
                                scrollbar: {
                                    vertical: 'hidden'
                                }
                            }}
                        />
                    </motion.div>

                    {index < chatHistory.length - 1 && (
                        <div className="border-t border-gray-700 my-4" />
                    )}
                </div>
            ))}

            {isLoading && (
                <div className="flex justify-center p-4">
                    <ReactLoading type="cylon" color="#60A5FA" height={30} width={30} />
                </div>
            )}

            {/* Context Modal */}
            <Dialog
                open={showContextModal}
                onClose={() => setShowContextModal(false)}
                className="relative z-50"
            >
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                        <Dialog.Title className="text-lg font-medium text-gray-200 mb-4">
                            Context Details
                        </Dialog.Title>
                        <div className="mt-2">
                            <Editor
                                height="400px"
                                defaultLanguage="plaintext"
                                value={selectedContext}
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
                        <div className="mt-4">
                            <button
                                type="button"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                onClick={() => setShowContextModal(false)}
                            >
                                Close
                            </button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </div>
    )
} 