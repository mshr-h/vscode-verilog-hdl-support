#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error('usage: patch-slang-server-wasi.mjs <slang-server-source-dir>');
  process.exit(1);
}

function patchFile(relativePath, replacements) {
  const filePath = path.join(sourceDir, relativePath);
  let text = fs.readFileSync(filePath, 'utf8');
  for (const [from, to] of replacements) {
    if (text.includes(to)) {
      continue;
    }
    if (!text.includes(from)) {
      console.error(`error: WASI patch anchor not found in ${relativePath}`);
      process.exit(1);
    }
    text = text.replace(from, to);
  }
  fs.writeFileSync(filePath, text);
}

patchFile('include/ast/WcpClient.h', [
  [
    '#    include <unistd.h>\n#endif\n',
    '#    include <unistd.h>\n#    ifdef __wasi__\n#        ifndef MSG_DONTWAIT\n#            define MSG_DONTWAIT 0\n#        endif\n#    endif\n#endif\n'
  ]
]);

patchFile('include/lsp/LspServer.h', [
  [
    '        std::cerr << "Registered command: " << name << "\\n";\n',
    '#ifndef __wasi__\n        std::cerr << "Registered command: " << name << "\\n";\n#endif\n'
  ],
  [
    '    void registerInitialize() {\n        this->template registerMethod<InitializeParams, InitializeResult, &Impl::getInitialize>(\n            "initialize");\n    };\n',
    `    void registerInitialize() {
#ifdef __wasi__
        this->requests["initialize"] = [this](std::optional<rfl::Generic> paramsJson) -> rfl::Generic {
            InitializeParams params{};
            if (paramsJson) {
                auto root = paramsJson->to_object();
                if (root) {
                    auto rootPath = (*root)["rootPath"].to_string();
                    if (rootPath)
                        params.rootPath = rootPath.value();

                    auto rootUri = (*root)["rootUri"].to_string();
                    if (rootUri)
                        params.rootUri = URI(rootUri.value());

                    auto folders = (*root)["workspaceFolders"].to_array();
                    if (folders && !folders->empty()) {
                        std::vector<WorkspaceFolder> parsedFolders;
                        auto first = folders->front().to_object();
                        if (first) {
                            WorkspaceFolder folder;
                            auto uri = (*first)["uri"].to_string();
                            auto name = (*first)["name"].to_string();
                            if (uri)
                                folder.uri = URI(uri.value());
                            if (name)
                                folder.name = name.value();
                            else
                                folder.name = "workspace";
                            parsedFolders.push_back(folder);
                            params.workspaceFolders = parsedFolders;
                        }
                    }
                }
            }
            return rfl::to_generic<rfl::UnderlyingEnums>(
                (static_cast<Impl*>(this)->getInitialize(params)));
        };
#else
        this->template registerMethod<InitializeParams, InitializeResult, &Impl::getInitialize>(
            "initialize");
#endif
    };
`
  ]
]);

patchFile('src/ast/WcpClient.cpp', [
  [
    '#    include <sys/wait.h>\n#    include <unistd.h>\n#endif\n',
    '#    ifndef __wasi__\n#        include <sys/wait.h>\n#    endif\n#    include <unistd.h>\n#endif\n'
  ],
  [
    '#else\n    if (fork() == 0) {\n',
    '#elif defined(__wasi__)\n    (void)m_port;\n    std::cerr << "WCP waveform viewer launch is unsupported in WASI" << std::endl;\n#else\n    if (fork() == 0) {\n'
  ],
  [
    'void waves::WcpClient::initClient() {\n    // Create socket\n',
    'void waves::WcpClient::initClient() {\n#ifdef __wasi__\n    std::cerr << "WCP sockets are unsupported in WASI" << std::endl;\n    m_running = false;\n    return;\n#else\n    // Create socket\n'
  ],
  [
    '    m_port = ntohs(assignedAddr.sin_port);\n}\n\nvoid waves::WcpClient::greet() {\n    // Listen + accept connection\n',
    '    m_port = ntohs(assignedAddr.sin_port);\n#endif\n}\n\nvoid waves::WcpClient::greet() {\n#ifdef __wasi__\n    std::cerr << "WCP sockets are unsupported in WASI" << std::endl;\n    m_running = false;\n    return;\n#else\n    // Listen + accept connection\n'
  ],
  [
    '    }\n}\n\nvoid waves::WcpClient::runClient() {\n',
    '    }\n#endif\n}\n\nvoid waves::WcpClient::runClient() {\n'
  ]
]);

patchFile('src/lsp/URI.cpp', [
  ['scheme_ = {};', 'scheme_ = {0, 0};'],
  ['authority_ = {};', 'authority_ = {0, 0};'],
  ['query_ = {};', 'query_ = {0, 0};'],
  ['fragment_ = {};', 'fragment_ = {0, 0};']
]);

patchFile('external/slang/source/util/OS.cpp', [
  [
    '#include <fstream>\n',
    '#include <fstream>\n#include <iterator>\n'
  ],
  [
    '    int fd;\n    auto& pathStr = path.native();\n    const bool isStdin = pathStr == "-";\n\n',
    '    int fd;\n    auto& pathStr = path.native();\n    const bool isStdin = pathStr == "-";\n\n#ifdef __wasi__\n    if (!isStdin) {\n        std::ifstream file(path, std::ios::binary);\n        if (!file)\n            return std::make_error_code(std::errc::no_such_file_or_directory);\n\n        std::string contents((std::istreambuf_iterator<char>(file)),\n                             std::istreambuf_iterator<char>());\n        buffer.insert(buffer.end(), contents.begin(), contents.end());\n        if (buffer.empty() || buffer.back() != \'\\0\')\n            buffer.push_back(\'\\0\');\n        return {};\n    }\n#endif\n\n'
  ],
  [
    '            fd = ::open(pathStr.c_str(), O_RDONLY | O_CLOEXEC);\n',
    '#ifdef __wasi__\n            fd = ::open(pathStr.c_str(), O_RDONLY);\n#else\n            fd = ::open(pathStr.c_str(), O_RDONLY | O_CLOEXEC);\n#endif\n'
  ],
  [
    '    std::error_code ec;\n    struct stat status;\n    if (::fstat(fd, &status) != 0) {\n',
    '    std::error_code ec;\n#ifdef __wasi__\n    static constexpr size_t ChunkSize = 4 * 4096;\n\n    size_t currSize = 0;\n    while (true) {\n        buffer.resize_for_overwrite(currSize + ChunkSize + 1);\n\n        ssize_t numRead = ::read(fd, buffer.data() + currSize, ChunkSize);\n        if (numRead < 0) {\n            if (errno == EINTR)\n                continue;\n\n            ec.assign(errno, std::generic_category());\n            break;\n        }\n\n        currSize += (size_t)numRead;\n        if (numRead == 0)\n            break;\n    }\n\n    buffer.resize(currSize + 1);\n    buffer.back() = \'\\0\';\n#else\n    struct stat status;\n    if (::fstat(fd, &status) != 0) {\n'
  ],
  [
    '    if (!isStdin) {\n        if (::close(fd) < 0 && !ec)\n            ec.assign(errno, std::generic_category());\n    }\n\n    return ec;\n}\n\n#endif\n',
    '#endif\n\n    if (!isStdin) {\n        if (::close(fd) < 0 && !ec)\n            ec.assign(errno, std::generic_category());\n    }\n\n    return ec;\n}\n\n#endif\n'
  ]
]);

patchFile('external/slang/source/text/SourceManager.cpp', [
  [
    'SourceManager::SourceManager() {\n    // add a dummy entry to the start of the directory list so that our file IDs line up\n',
    'SourceManager::SourceManager() {\n#ifdef __wasi__\n    disableProximatePaths = true;\n#endif\n    // add a dummy entry to the start of the directory list so that our file IDs line up\n'
  ],
  [
    'std::error_code SourceManager::addSystemDirectories(std::string_view pattern) {\n    SmallVector<fs::path> dirs;\n    std::error_code ec;\n    svGlob({}, pattern, GlobMode::Directories, dirs, /* expandEnvVars */ false, ec);\n\n',
    'std::error_code SourceManager::addSystemDirectories(std::string_view pattern) {\n    SmallVector<fs::path> dirs;\n    std::error_code ec;\n#ifdef __wasi__\n    dirs.emplace_back(std::string(pattern));\n#else\n    svGlob({}, pattern, GlobMode::Directories, dirs, /* expandEnvVars */ false, ec);\n#endif\n\n'
  ],
  [
    'std::error_code SourceManager::addUserDirectories(std::string_view pattern) {\n    SmallVector<fs::path> dirs;\n    std::error_code ec;\n    svGlob({}, pattern, GlobMode::Directories, dirs, /* expandEnvVars */ false, ec);\n\n',
    'std::error_code SourceManager::addUserDirectories(std::string_view pattern) {\n    SmallVector<fs::path> dirs;\n    std::error_code ec;\n#ifdef __wasi__\n    dirs.emplace_back(std::string(pattern));\n#else\n    svGlob({}, pattern, GlobMode::Directories, dirs, /* expandEnvVars */ false, ec);\n#endif\n\n'
  ]
]);

patchFile('external/slang/source/driver/Driver.cpp', [
  [
    '#include <fmt/color.h>\n',
    '#include <fmt/color.h>\n#ifdef __wasi__\n#    include <fstream>\n#    include <iterator>\n#endif\n'
  ],
  [
    '    SmallVector<fs::path> files;\n    std::error_code globEc;\n    svGlob({}, pattern, GlobMode::Files, files, /* expandEnvVars */ false, globEc);\n    if (globEc)\n        return onError(pattern, globEc);\n\n',
    '    SmallVector<fs::path> files;\n#ifdef __wasi__\n    files.emplace_back(std::string(pattern));\n#else\n    std::error_code globEc;\n    svGlob({}, pattern, GlobMode::Files, files, /* expandEnvVars */ false, globEc);\n    if (globEc)\n        return onError(pattern, globEc);\n#endif\n\n'
  ],
  [
    '    for (auto& path : files) {\n        auto buffer = sourceManager.readSource(path);\n        if (!buffer)\n            return onError(getU8Str(path), buffer.error());\n\n        if (!activeCommandFiles.insert(path).second) {\n',
    '    for (auto& path : files) {\n#ifdef __wasi__\n        std::ifstream commandFile(path, std::ios::binary);\n        if (!commandFile)\n            return onError(getU8Str(path), std::make_error_code(std::errc::no_such_file_or_directory));\n        std::string commandText((std::istreambuf_iterator<char>(commandFile)),\n                                std::istreambuf_iterator<char>());\n        SmallVector<char> commandBuffer;\n        commandBuffer.insert(commandBuffer.end(), commandText.begin(), commandText.end());\n        if (commandBuffer.empty() || commandBuffer.back() != \'\\0\')\n            commandBuffer.push_back(\'\\0\');\n        auto buffer = sourceManager.assignBuffer(getU8Str(path), std::move(commandBuffer));\n#else\n        auto buffer = sourceManager.readSource(path);\n        if (!buffer)\n            return onError(getU8Str(path), buffer.error());\n#endif\n\n        if (!activeCommandFiles.insert(path).second) {\n'
  ],
  [
    '            result = parseUnitListing(*buffer);\n',
    '#ifdef __wasi__\n            result = parseUnitListing(buffer);\n#else\n            result = parseUnitListing(*buffer);\n#endif\n'
  ],
  [
    '            parseOpts.sourceBuffer = *buffer;\n            result = parseCommandLine(buffer->data, parseOpts);\n',
    '#ifdef __wasi__\n            parseOpts.sourceBuffer = buffer;\n            result = parseCommandLine(buffer.data, parseOpts);\n#else\n            parseOpts.sourceBuffer = *buffer;\n            result = parseCommandLine(buffer->data, parseOpts);\n#endif\n'
  ]
]);

patchFile('external/slang/source/driver/SourceLoader.cpp', [
  [
    '    SmallVector<fs::path> files;\n    std::error_code ec;\n    auto rank = svGlob(basePath, pattern, GlobMode::Files, files, expandEnvVars, ec);\n\n',
    '    SmallVector<fs::path> files;\n    std::error_code ec;\n#ifdef __wasi__\n    auto rank = GlobRank::ExactPath;\n    auto path = basePath.empty() ? fs::path(std::string(pattern)) : basePath / std::string(pattern);\n    files.emplace_back(std::move(path));\n#else\n    auto rank = svGlob(basePath, pattern, GlobMode::Files, files, expandEnvVars, ec);\n#endif\n\n'
  ],
  [
    '    if (ec && !dirPrefixes.empty()) {\n        // The file was not found at the given path; try prepending each\n        // registered directory prefix in the order they were added.\n        auto patternStr = "/"s + std::string(pattern);\n        for (auto& prefix : dirPrefixes) {\n            SmallVector<fs::path> prefixed;\n            std::error_code prefixEc;\n            auto prefixRank = svGlob(basePath, prefix + patternStr, GlobMode::Files, prefixed,\n                                     expandEnvVars, prefixEc);\n            if (!prefixEc) {\n                files = std::move(prefixed);\n                rank = prefixRank;\n                ec.clear();\n                break;\n            }\n        }\n    }\n\n    if (ec) {\n',
    '#ifndef __wasi__\n    if (ec && !dirPrefixes.empty()) {\n        // The file was not found at the given path; try prepending each\n        // registered directory prefix in the order they were added.\n        auto patternStr = "/"s + std::string(pattern);\n        for (auto& prefix : dirPrefixes) {\n            SmallVector<fs::path> prefixed;\n            std::error_code prefixEc;\n            auto prefixRank = svGlob(basePath, prefix + patternStr, GlobMode::Files, prefixed,\n                                     expandEnvVars, prefixEc);\n            if (!prefixEc) {\n                files = std::move(prefixed);\n                rank = prefixRank;\n                ec.clear();\n                break;\n            }\n        }\n    }\n#endif\n\n    if (ec) {\n'
  ]
]);

patchFile('src/ServerDriver.cpp', [
  [
    '                newDriver->updateDoc(*newDocit->second, FileUpdateType::OPEN);\n',
    '#ifndef __wasi__\n                newDriver->updateDoc(*newDocit->second, FileUpdateType::OPEN);\n#endif\n'
  ],
  [
    '    if (comp && type == FileUpdateType::SAVE) {\n',
    '#ifdef __wasi__\n    if (comp && (type == FileUpdateType::SAVE || type == FileUpdateType::CHANGE)) {\n#else\n    if (comp && type == FileUpdateType::SAVE) {\n#endif\n'
  ]
]);

patchFile('src/SlangServer.cpp', [
  [
    '#include <filesystem>\n#include <fmt/base.h>\n',
    '#include <filesystem>\n#include <fmt/base.h>\n#include <iostream>\n'
  ],
  [
    '#include <algorithm>\n#include <cctype>\n',
    '#include <algorithm>\n#include <cctype>\n#include <cstdlib>\n'
  ],
  [
    'namespace server {\n\nSlangServer::SlangServer',
    'namespace server {\n\n#ifdef __wasi__\nstatic std::string makeWasiWorkspaceAbsolute(const std::string& value,\n                                             const std::optional<lsp::WorkspaceFolder>& workspace) {\n    if (value.empty() || !workspace.has_value() || std::filesystem::path(value).is_absolute())\n        return value;\n    return (std::filesystem::path(workspace->uri.getPath()) / value).string();\n}\n#endif\n\nSlangServer::SlangServer'
  ],
  [
    'lsp::InitializeResult SlangServer::getInitialize(const lsp::InitializeParams& params) {\n    // TODO: may want to use raw strings here bc all these types make compile time longer\n',
    'lsp::InitializeResult SlangServer::getInitialize(const lsp::InitializeParams& params) {\n#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_TRACE_INIT"))\n        std::cerr << "WASI initialize checkpoint: begin" << std::endl;\n#endif\n    // TODO: may want to use raw strings here bc all these types make compile time longer\n'
  ],
  [
    '    // Workspace Features\n    registerWorkspaceExecuteCommand();\n',
    '#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_TRACE_INIT"))\n        std::cerr << "WASI initialize checkpoint: document features registered" << std::endl;\n#endif\n    // Workspace Features\n    registerWorkspaceExecuteCommand();\n'
  ],
  [
    '    // LSP Lifecycle\n    registerInitialized();\n\n    INFO("Server started with pid: {}", OS::getpid());\n',
    '#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_TRACE_INIT"))\n        std::cerr << "WASI initialize checkpoint: workspace features registered" << std::endl;\n#endif\n    // LSP Lifecycle\n    registerInitialized();\n\n#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_TRACE_INIT"))\n        std::cerr << "WASI initialize checkpoint: lifecycle registered" << std::endl;\n#endif\n    INFO("Server started with pid: {}", OS::getpid());\n#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_TRACE_INIT"))\n        std::cerr << "WASI initialize checkpoint: startup log emitted" << std::endl;\n#endif\n'
  ],
  [
    '    // Config modification\n    registerCommand<std::string, std::monostate, &SlangServer::addDefine>("slang.addDefine");\n\n    if (params.workspaceFolders.has_value() && !params.workspaceFolders->empty()) {\n',
    '    // Config modification\n    registerCommand<std::string, std::monostate, &SlangServer::addDefine>("slang.addDefine");\n#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_TRACE_INIT"))\n        std::cerr << "WASI initialize checkpoint: slang commands registered" << std::endl;\n#endif\n\n    if (params.workspaceFolders.has_value() && !params.workspaceFolders->empty()) {\n'
  ],
  [
    '    if (m_workspaceFolder) {\n        INFO("Using workspace folder: {}", m_workspaceFolder->uri.getPath());\n    }\n    else {\n        WARN("No workspace folder or root provided");\n    }\n\n',
    '    if (m_workspaceFolder) {\n        INFO("Using workspace folder: {}", m_workspaceFolder->uri.getPath());\n#ifdef __wasi__\n        std::error_code ec;\n        std::filesystem::current_path(m_workspaceFolder->uri.getPath(), ec);\n        if (ec) {\n            ERROR("Failed to set WASI current directory to {}: {}", m_workspaceFolder->uri.getPath(), ec.message());\n        }\n        else {\n            INFO("Using WASI current directory: {}", std::filesystem::current_path().string());\n        }\n#endif\n    }\n    else {\n        WARN("No workspace folder or root provided");\n    }\n\n'
  ],
  [
    '    loadConfig();\n\n    if (params.capabilities.experimental) {\n',
    '#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_SKIP_STARTUP_INDEXING") == nullptr) {\n        loadConfig();\n    }\n    else if (std::getenv("SLANG_SERVER_WASI_TRACE_INIT")) {\n        std::cerr << "WASI initialize checkpoint: skipping startup config load" << std::endl;\n    }\n#else\n    loadConfig();\n#endif\n\n    if (params.capabilities.experimental) {\n'
  ],
  [
    '    auto result =\n        lsp::InitializeResult{\n',
    '#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_TRACE_INIT"))\n        std::cerr << "WASI initialize checkpoint: building result" << std::endl;\n#endif\n    auto result =\n        lsp::InitializeResult{\n'
  ],
  [
    '    INFO("Initialize result: {} ", rfl::json::write(result));\n\n    return result;\n}\n',
    '#ifndef __wasi__\n    INFO("Initialize result: {} ", rfl::json::write(result));\n#endif\n\n    return result;\n}\n'
  ],
  [
    'void SlangServer::onInitialized(const lsp::InitializedParams&) {\n    INFO("Server initialized at {}", m_workspaceFolder ? m_workspaceFolder->uri.getPath() : "none");\n    m_client.setConfig(m_config);\n',
    'void SlangServer::onInitialized(const lsp::InitializedParams&) {\n    INFO("Server initialized at {}", m_workspaceFolder ? m_workspaceFolder->uri.getPath() : "none");\n#ifdef __wasi__\n    if (std::getenv("SLANG_SERVER_WASI_SKIP_STARTUP_INDEXING") != nullptr) {\n        loadConfig();\n    }\n    else {\n        m_client.setConfig(m_config);\n    }\n#else\n    m_client.setConfig(m_config);\n#endif\n'
  ],
  [
    'void SlangServer::loadConfig(const Config& config, bool forceIndexing) {\n    auto old_config = m_config;\n    m_config = Config(config);\n',
    'void SlangServer::loadConfig(const Config& config, bool forceIndexing) {\n    auto old_config = m_config;\n    m_config = Config(config);\n#ifdef __wasi__\n    if (m_config.build.value().has_value()) {\n        m_config.build = makeWasiWorkspaceAbsolute(*m_config.build.value(), m_workspaceFolder);\n    }\n#endif\n'
  ],
  [
    '    loadConfig(Config::fromFiles(workspaceConf, userConf, localConf, m_client), true);\n',
    '    bool forceIndexing = true;\n#ifdef __wasi__\n    forceIndexing = std::getenv("SLANG_SERVER_WASI_SKIP_STARTUP_INDEXING") == nullptr;\n#endif\n    loadConfig(Config::fromFiles(workspaceConf, userConf, localConf, m_client), forceIndexing);\n'
  ]
]);

const wasiStubPath = path.join(sourceDir, 'src', 'wasi', 'WasiExceptionStubs.cpp');
fs.mkdirSync(path.dirname(wasiStubPath), { recursive: true });
fs.writeFileSync(wasiStubPath, `// SPDX-License-Identifier: MIT
#include <BS_thread_pool.hpp>
#include <cstdlib>
#include <cstring>
#include <optional>

extern "C" {

void* __cxa_allocate_exception(unsigned long thrownSize) {
    return std::malloc(thrownSize == 0 ? 1 : thrownSize);
}

void __cxa_free_exception(void* thrownException) {
    std::free(thrownException);
}

[[noreturn]] void __cxa_throw(void*, void*, void (*)(void*)) {
    std::abort();
}

void* __cxa_begin_catch(void* exceptionObject) {
    return exceptionObject;
}

void __cxa_end_catch() {}

[[noreturn]] void __cxa_rethrow() {
    std::abort();
}

[[noreturn]] void __cxa_bad_cast() {
    std::abort();
}

[[noreturn]] void __cxa_bad_typeid() {
    std::abort();
}

int __gxx_personality_v0(...) {
    return 0;
}

}

namespace BS {
thread_local std::optional<std::size_t> this_thread::my_index = std::nullopt;
thread_local std::optional<void*> this_thread::my_pool = std::nullopt;
}
`);

patchFile('CMakeLists.txt', [
  [
    '  src/ast/WcpClient.cpp\n  src/document/DefinitionInfo.cpp\n',
    '  src/ast/WcpClient.cpp\n  src/wasi/WasiExceptionStubs.cpp\n  src/document/DefinitionInfo.cpp\n'
  ]
]);
