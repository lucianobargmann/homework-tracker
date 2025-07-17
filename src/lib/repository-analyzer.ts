// Repository Analysis for AI Challenge Scoring
// File: /src/lib/repository-analyzer.ts

import { readdir, readFile, stat } from 'fs/promises'
import { join, extname } from 'path'
import { exec, ExecOptions } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface RepositoryAnalysis {
  directory: string
  files: FileInfo[]
  promptsFile: string | null
  readmeFile: string | null
  packageJson: any
  codeAnalysis: CodeAnalysis
}

export interface FileInfo {
  path: string
  type: 'file' | 'directory'
  size: number
  extension?: string
}

export interface CodeAnalysis {
  languages: string[]
  frameworks: string[]
  hasTests: boolean
  hasDocumentation: boolean
  codeQuality: number
}

export class RepositoryAnalyzer {
  private tempDir: string

  constructor() {
    this.tempDir = '/tmp/repo-analysis'
  }

  async analyzeFromGitHub(githubUrl: string): Promise<RepositoryAnalysis> {
    let cloneDir: string | null = null
    
    try {
      // Clone repository locally to avoid rate limits
      cloneDir = await this.cloneRepository(githubUrl)
      const analysis = await this.analyzeDirectory(cloneDir)
      return analysis
    } catch (error) {
      console.error('Error analyzing GitHub repository:', error)
      throw error
    } finally {
      // Always cleanup the cloned directory
      if (cloneDir) {
        await this.cleanup(cloneDir)
      }
    }
  }

  async analyzeFromGitHubAPI(githubUrl: string): Promise<RepositoryAnalysis> {
    const { GitHubClient } = await import('./github-client')
    const githubClient = new GitHubClient()

    // Get repository info
    const repoInfo = await githubClient.getRepositoryInfo(githubUrl)
    
    // Get file listing using API
    const files = await this.getFileListFromAPI(githubClient, githubUrl)
    
    // Find special files using API
    const promptsFile = await this.findPromptsFileFromAPI(githubClient, githubUrl, files)
    const readmeFile = await this.findReadmeFileFromAPI(githubClient, githubUrl, files)
    const packageJson = await this.findPackageJsonFromAPI(githubClient, githubUrl, files)
    
    // Analyze code
    const codeAnalysis = await this.analyzeCodeFromAPI(githubClient, githubUrl, files, packageJson)
    
    return {
      directory: githubUrl,
      files,
      promptsFile,
      readmeFile,
      packageJson,
      codeAnalysis
    }
  }

  async analyzeDirectory(directory: string): Promise<RepositoryAnalysis> {
    // Step 1: Get all files
    const files = await this.getFileList(directory)
    
    // Step 2: Find special files
    const promptsFile = await this.findPromptsFile(directory, files)
    const readmeFile = await this.findReadmeFile(directory, files)
    const packageJson = await this.findPackageJson(directory, files)
    
    // Step 3: Analyze code
    const codeAnalysis = await this.analyzeCode(directory, files)
    
    return {
      directory,
      files,
      promptsFile,
      readmeFile,
      packageJson,
      codeAnalysis
    }
  }

  private async cloneRepository(githubUrl: string): Promise<string> {
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(7)
    const cloneDir = join(this.tempDir, `repo-${timestamp}-${randomSuffix}`)
    
    try {
      // Ensure temp directory exists
      await execAsync(`mkdir -p ${this.tempDir}`)
      
      // Clone the repository with timeout and depth limit for faster cloning
      await execAsync(`timeout 300 git clone --depth 1 --single-branch "${githubUrl}" "${cloneDir}"`, {
        timeout: 300000 // 5 minutes timeout
      } as ExecOptions)
      
      console.log(`Repository cloned to: ${cloneDir}`)
      return cloneDir
    } catch (error) {
      console.error('Error cloning repository:', error)
      // Cleanup on failure
      if (cloneDir) {
        await this.cleanup(cloneDir)
      }
      throw new Error(`Failed to clone repository: ${githubUrl}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async getFileList(directory: string): Promise<FileInfo[]> {
    const files: FileInfo[] = []
    
    const walk = async (dir: string, basePath: string = ''): Promise<void> => {
      const entries = await readdir(dir, { withFileTypes: true })
      
      for (const entry of entries) {
        // Skip hidden files and common ignore patterns
        if (entry.name.startsWith('.') || 
            entry.name === 'node_modules' || 
            entry.name === 'dist' || 
            entry.name === 'build') {
          continue
        }
        
        const fullPath = join(dir, entry.name)
        const relativePath = join(basePath, entry.name)
        
        try {
          const stats = await stat(fullPath)
          
          if (entry.isDirectory()) {
            files.push({
              path: relativePath,
              type: 'directory',
              size: 0
            })
            await walk(fullPath, relativePath)
          } else {
            files.push({
              path: relativePath,
              type: 'file',
              size: stats.size,
              extension: extname(entry.name).slice(1)
            })
          }
        } catch (error) {
          // Skip files that can't be accessed
          continue
        }
      }
    }
    
    await walk(directory)
    return files
  }

  private async findPromptsFile(directory: string, files: FileInfo[]): Promise<string | null> {
    // Look for common prompts file names
    const promptsFiles = files.filter(file => 
      file.type === 'file' && (
        file.path.toLowerCase().includes('prompt') ||
        file.path.toLowerCase().includes('ai') ||
        file.path.toLowerCase().includes('claude') ||
        file.path.toLowerCase().includes('gpt') ||
        file.path.toLowerCase().includes('conversation') ||
        file.path.toLowerCase().includes('chat')
      )
    )
    
    if (promptsFiles.length === 0) return null
    
    // Prefer files with more specific names
    const preferred = promptsFiles.find(file => 
      file.path.toLowerCase().includes('prompts') ||
      file.path.toLowerCase().includes('ai-prompts') ||
      file.path.toLowerCase().includes('claude-prompts')
    )
    
    const targetFile = preferred || promptsFiles[0]
    
    try {
      const content = await readFile(join(directory, targetFile.path), 'utf-8')
      return content
    } catch (error) {
      return null
    }
  }

  private async findReadmeFile(directory: string, files: FileInfo[]): Promise<string | null> {
    const readmeFile = files.find(file => 
      file.type === 'file' && 
      file.path.toLowerCase().startsWith('readme')
    )
    
    if (!readmeFile) return null
    
    try {
      const content = await readFile(join(directory, readmeFile.path), 'utf-8')
      return content
    } catch (error) {
      return null
    }
  }

  private async findPackageJson(directory: string, files: FileInfo[]): Promise<any> {
    const packageFile = files.find(file => 
      file.type === 'file' && 
      file.path === 'package.json'
    )
    
    if (!packageFile) return null
    
    try {
      const content = await readFile(join(directory, packageFile.path), 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      return null
    }
  }

  private async analyzeCode(directory: string, files: FileInfo[]): Promise<CodeAnalysis> {
    // Analyze languages
    const languages = this.detectLanguages(files)
    
    // Analyze frameworks
    const frameworks = await this.detectFrameworks(directory, files)
    
    // Check for tests
    const hasTests = this.detectTests(files)
    
    // Check for documentation
    const hasDocumentation = this.detectDocumentation(files)
    
    // Calculate code quality score
    const codeQuality = this.calculateCodeQuality(files)
    
    return {
      languages,
      frameworks,
      hasTests,
      hasDocumentation,
      codeQuality
    }
  }

  private detectLanguages(files: FileInfo[]): string[] {
    const languageMap: { [key: string]: string } = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'tsx': 'TypeScript',
      'jsx': 'JavaScript',
      'py': 'Python',
      'java': 'Java',
      'kt': 'Kotlin',
      'swift': 'Swift',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'go': 'Go',
      'rs': 'Rust',
      'php': 'PHP',
      'rb': 'Ruby',
      'dart': 'Dart',
      'vue': 'Vue.js',
      'svelte': 'Svelte'
    }
    
    const detectedLanguages = new Set<string>()
    
    files.forEach(file => {
      if (file.extension && languageMap[file.extension]) {
        detectedLanguages.add(languageMap[file.extension])
      }
    })
    
    return Array.from(detectedLanguages)
  }

  private async detectFrameworks(directory: string, files: FileInfo[]): Promise<string[]> {
    const frameworks: string[] = []
    
    // Check package.json for framework dependencies
    const packageFile = files.find(f => f.path === 'package.json')
    if (packageFile) {
      try {
        const content = await readFile(join(directory, packageFile.path), 'utf-8')
        const packageJson = JSON.parse(content)
        
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
        
        // Common frameworks
        if (deps.react) frameworks.push('React')
        if (deps.next) frameworks.push('Next.js')
        if (deps.vue) frameworks.push('Vue.js')
        if (deps.angular) frameworks.push('Angular')
        if (deps.express) frameworks.push('Express')
        if (deps.fastify) frameworks.push('Fastify')
        if (deps.koa) frameworks.push('Koa')
        if (deps.nestjs) frameworks.push('NestJS')
        if (deps.prisma) frameworks.push('Prisma')
        if (deps.sequelize) frameworks.push('Sequelize')
        if (deps.mongoose) frameworks.push('Mongoose')
        if (deps.flutter) frameworks.push('Flutter')
        if (deps['react-native']) frameworks.push('React Native')
        
      } catch (error) {
        // Ignore JSON parsing errors
      }
    }
    
    // Check for other framework indicators
    if (files.some(f => f.path.includes('flutter'))) frameworks.push('Flutter')
    if (files.some(f => f.path.includes('react-native'))) frameworks.push('React Native')
    if (files.some(f => f.path.includes('django'))) frameworks.push('Django')
    if (files.some(f => f.path.includes('rails'))) frameworks.push('Rails')
    
    return frameworks
  }

  private detectTests(files: FileInfo[]): boolean {
    return files.some(file => 
      file.path.includes('test') ||
      file.path.includes('spec') ||
      file.path.includes('__tests__') ||
      file.path.includes('.test.') ||
      file.path.includes('.spec.')
    )
  }

  private detectDocumentation(files: FileInfo[]): boolean {
    return files.some(file => 
      file.path.toLowerCase().includes('readme') ||
      file.path.toLowerCase().includes('doc') ||
      file.path.toLowerCase().includes('guide') ||
      file.extension === 'md'
    )
  }

  private calculateCodeQuality(files: FileInfo[]): number {
    let score = 0
    
    // Base score for having code files
    const codeFiles = files.filter(f => 
      f.type === 'file' && 
      ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'kt', 'swift'].includes(f.extension || '')
    )
    
    if (codeFiles.length > 0) score += 30
    
    // Bonus for TypeScript usage
    const tsFiles = files.filter(f => ['ts', 'tsx'].includes(f.extension || ''))
    if (tsFiles.length > codeFiles.length * 0.5) score += 20
    
    // Bonus for proper project structure
    if (files.some(f => f.path.includes('src/'))) score += 15
    if (files.some(f => f.path.includes('lib/'))) score += 10
    if (files.some(f => f.path.includes('components/'))) score += 10
    
    // Bonus for configuration files
    if (files.some(f => f.path.includes('tsconfig.json'))) score += 5
    if (files.some(f => f.path.includes('eslint'))) score += 5
    if (files.some(f => f.path.includes('prettier'))) score += 5
    
    return Math.min(score, 100)
  }

  private async cleanup(directory: string): Promise<void> {
    try {
      console.log(`Cleaning up temporary directory: ${directory}`)
      await execAsync(`rm -rf "${directory}"`)
      console.log(`Successfully cleaned up: ${directory}`)
    } catch (error) {
      console.error('Error cleaning up temporary directory:', error)
      // Try with sudo if regular cleanup fails (shouldn't be needed in Docker)
      try {
        await execAsync(`sudo rm -rf "${directory}"`)
      } catch (sudoError) {
        console.error('Sudo cleanup also failed:', sudoError)
      }
    }
  }

  // GitHub API-based methods for safer analysis
  private async getFileListFromAPI(githubClient: any, githubUrl: string): Promise<FileInfo[]> {
    const files: FileInfo[] = []
    
    const walk = async (path: string = ''): Promise<void> => {
      try {
        const listing = await githubClient.getDirectoryListing(githubUrl, path)
        
        for (const item of listing) {
          // Skip hidden files and common ignore patterns
          if (item.name.startsWith('.') || 
              item.name === 'node_modules' || 
              item.name === 'dist' || 
              item.name === 'build') {
            continue
          }
          
          const relativePath = path ? `${path}/${item.name}` : item.name
          
          if (item.type === 'dir') {
            files.push({
              path: relativePath,
              type: 'directory',
              size: 0
            })
            await walk(relativePath)
          } else if (item.type === 'file') {
            files.push({
              path: relativePath,
              type: 'file',
              size: item.size || 0,
              extension: extname(item.name).slice(1)
            })
          }
        }
      } catch (error) {
        // Continue on errors (might be rate limited or private directories)
        console.error(`Error walking directory ${path}:`, error)
      }
    }
    
    await walk()
    return files
  }

  private async findPromptsFileFromAPI(githubClient: any, githubUrl: string, files: FileInfo[]): Promise<string | null> {
    // Look for common prompts file names
    const promptsFiles = files.filter(file => 
      file.type === 'file' && (
        file.path.toLowerCase().includes('prompt') ||
        file.path.toLowerCase().includes('ai') ||
        file.path.toLowerCase().includes('claude') ||
        file.path.toLowerCase().includes('gpt') ||
        file.path.toLowerCase().includes('conversation') ||
        file.path.toLowerCase().includes('chat')
      )
    )
    
    if (promptsFiles.length === 0) return null
    
    // Prefer files with more specific names
    const preferred = promptsFiles.find(file => 
      file.path.toLowerCase().includes('prompts') ||
      file.path.toLowerCase().includes('ai-prompts') ||
      file.path.toLowerCase().includes('claude-prompts')
    )
    
    const targetFile = preferred || promptsFiles[0]
    
    try {
      const content = await githubClient.getFileContent(githubUrl, targetFile.path)
      return content
    } catch (error) {
      return null
    }
  }

  private async findReadmeFileFromAPI(githubClient: any, githubUrl: string, files: FileInfo[]): Promise<string | null> {
    const readmeFile = files.find(file => 
      file.type === 'file' && 
      file.path.toLowerCase().startsWith('readme')
    )
    
    if (!readmeFile) return null
    
    try {
      const content = await githubClient.getFileContent(githubUrl, readmeFile.path)
      return content
    } catch (error) {
      return null
    }
  }

  private async findPackageJsonFromAPI(githubClient: any, githubUrl: string, files: FileInfo[]): Promise<any> {
    const packageFile = files.find(file => 
      file.type === 'file' && 
      file.path === 'package.json'
    )
    
    if (!packageFile) return null
    
    try {
      const content = await githubClient.getFileContent(githubUrl, packageFile.path)
      return content ? JSON.parse(content) : null
    } catch (error) {
      return null
    }
  }

  private async analyzeCodeFromAPI(githubClient: any, githubUrl: string, files: FileInfo[], packageJson: any): Promise<CodeAnalysis> {
    // Analyze languages
    const languages = this.detectLanguages(files)
    
    // Analyze frameworks from package.json and files
    const frameworks = await this.detectFrameworksFromAPI(packageJson, files)
    
    // Check for tests
    const hasTests = this.detectTests(files)
    
    // Check for documentation
    const hasDocumentation = this.detectDocumentation(files)
    
    // Calculate code quality score
    const codeQuality = this.calculateCodeQuality(files)
    
    return {
      languages,
      frameworks,
      hasTests,
      hasDocumentation,
      codeQuality
    }
  }

  private async detectFrameworksFromAPI(packageJson: any, files: FileInfo[]): Promise<string[]> {
    const frameworks: string[] = []
    
    // Check package.json for framework dependencies
    if (packageJson) {
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies }
      
      // Common frameworks
      if (deps.react) frameworks.push('React')
      if (deps.next) frameworks.push('Next.js')
      if (deps.vue) frameworks.push('Vue.js')
      if (deps.angular) frameworks.push('Angular')
      if (deps.express) frameworks.push('Express')
      if (deps.fastify) frameworks.push('Fastify')
      if (deps.koa) frameworks.push('Koa')
      if (deps.nestjs) frameworks.push('NestJS')
      if (deps.prisma) frameworks.push('Prisma')
      if (deps.sequelize) frameworks.push('Sequelize')
      if (deps.mongoose) frameworks.push('Mongoose')
      if (deps.flutter) frameworks.push('Flutter')
      if (deps['react-native']) frameworks.push('React Native')
    }
    
    // Check for other framework indicators
    if (files.some(f => f.path.includes('flutter'))) frameworks.push('Flutter')
    if (files.some(f => f.path.includes('react-native'))) frameworks.push('React Native')
    if (files.some(f => f.path.includes('django'))) frameworks.push('Django')
    if (files.some(f => f.path.includes('rails'))) frameworks.push('Rails')
    
    return frameworks
  }
}