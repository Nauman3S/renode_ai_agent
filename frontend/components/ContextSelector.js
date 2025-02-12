import { Fragment } from 'react'
import { Menu, Transition } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/20/solid'

export default function ContextSelector({ 
    files, 
    logs,
    selectedContexts, 
    setSelectedContexts 
}) {
    const handleContextChange = (contextId) => {
        if (contextId === 'opened_content') {
            setSelectedContexts(['opened_content']);
            return;
        }

        let newContexts = [...selectedContexts];
        
        // If opened_content is selected, remove it when selecting other contexts
        if (newContexts.includes('opened_content')) {
            newContexts = newContexts.filter(c => c !== 'opened_content');
        }

        if (newContexts.includes(contextId)) {
            newContexts = newContexts.filter(c => c !== contextId);
        } else {
            newContexts.push(contextId);
        }

        // If no contexts selected, default to opened_content
        if (newContexts.length === 0) {
            newContexts = ['opened_content'];
        }

        setSelectedContexts(newContexts);
    };

    const getDisplayText = () => {
        if (selectedContexts.includes('opened_content')) {
            return 'Opened Content';
        }
        const selectedItems = [
            ...files.filter(f => selectedContexts.includes(f.id)),
            ...(selectedContexts.includes('logs') ? [{ name: 'Execution Logs' }] : [])
        ];
        return selectedItems.map(item => item.name).join(', ');
    };

    return (
        <Menu as="div" className="relative inline-block text-left w-full mb-2">
            <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-600">
                <span className="truncate">
                    Context: {getDisplayText()}
                </span>
                <ChevronUpDownIcon className="-mr-1 h-5 w-5 text-gray-400" aria-hidden="true" />
            </Menu.Button>

            <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <Menu.Items className="absolute bottom-full mb-1 w-full rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="p-1">
                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => handleContextChange('opened_content')}
                                    className={`flex w-full items-center rounded-md px-2 py-2 text-sm ${
                                        active ? 'bg-gray-700' : ''
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedContexts.includes('opened_content')}
                                        readOnly
                                        className="mr-2"
                                    />
                                    Opened Content
                                </button>
                            )}
                        </Menu.Item>

                        {files.map(file => (
                            <Menu.Item key={file.id}>
                                {({ active }) => (
                                    <button
                                        onClick={() => handleContextChange(file.id)}
                                        className={`flex w-full items-center rounded-md px-2 py-2 text-sm ${
                                            active ? 'bg-gray-700' : ''
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedContexts.includes(file.id)}
                                            readOnly
                                            className="mr-2"
                                        />
                                        {file.name}
                                    </button>
                                )}
                            </Menu.Item>
                        ))}

                        <Menu.Item>
                            {({ active }) => (
                                <button
                                    onClick={() => handleContextChange('logs')}
                                    className={`flex w-full items-center rounded-md px-2 py-2 text-sm ${
                                        active ? 'bg-gray-700' : ''
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedContexts.includes('logs')}
                                        readOnly
                                        className="mr-2"
                                    />
                                    Execution Logs
                                </button>
                            )}
                        </Menu.Item>
                    </div>
                </Menu.Items>
            </Transition>
        </Menu>
    );
} 