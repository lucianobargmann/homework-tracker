// GitHub Client for Repository Operations
// File: /src/lib/github-client.ts

export interface GitHubRepo {
  url: string
  name: string
  owner: string
  defaultBranch: string
  isPrivate: boolean
  createdAt: string
  updatedAt: string
  size: number
  language: string | null
  description: string | null
}

export class GitHubClient {
  private apiBase = 'https://api.github.com'

  constructor(private token?: string) {}

  async getRepositoryInfo(githubUrl: string): Promise<GitHubRepo> {
    const { owner, repo } = this.parseGitHubUrl(githubUrl)
    
    const url = `${this.apiBase}/repos/${owner}/${repo}`
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'homework-tracker-scoring'
    }
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`
    }
    
    try {
      const response = await fetch(url, { headers })
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return {
        url: githubUrl,
        name: data.name,
        owner: data.owner.login,
        defaultBranch: data.default_branch,
        isPrivate: data.private,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        size: data.size,
        language: data.language,
        description: data.description
      }
    } catch (error) {
      console.error('Error fetching repository info:', error)
      throw error
    }
  }

  async getFileContent(githubUrl: string, filePath: string): Promise<string | null> {
    const { owner, repo } = this.parseGitHubUrl(githubUrl)
    
    const url = `${this.apiBase}/repos/${owner}/${repo}/contents/${filePath}`
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'homework-tracker-scoring'
    }
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`
    }
    
    try {
      const response = await fetch(url, { headers })
      
      if (!response.ok) {
        if (response.status === 404) {
          return null // File not found
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.type === 'file' && data.encoding === 'base64') {
        return Buffer.from(data.content, 'base64').toString('utf-8')
      }
      
      return null
    } catch (error) {
      console.error('Error fetching file content:', error)
      return null
    }
  }

  async getDirectoryListing(githubUrl: string, path: string = ''): Promise<any[]> {
    const { owner, repo } = this.parseGitHubUrl(githubUrl)
    
    const url = `${this.apiBase}/repos/${owner}/${repo}/contents/${path}`
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'homework-tracker-scoring'
    }
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`
    }
    
    try {
      const response = await fetch(url, { headers })
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return Array.isArray(data) ? data : []
    } catch (error) {
      console.error('Error fetching directory listing:', error)
      return []
    }
  }

  isValidGitHubUrl(url: string): boolean {
    const patterns = [
      /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/,
      /^git@github\.com:[^\/]+\/[^\/]+\.git$/,
      /^https:\/\/github\.com\/[^\/]+\/[^\/]+\.git$/
    ]
    
    return patterns.some(pattern => pattern.test(url))
  }

  private parseGitHubUrl(githubUrl: string): { owner: string; repo: string } {
    // Handle different GitHub URL formats
    let cleanUrl = githubUrl.replace(/\.git$/, '')
    
    // Convert SSH to HTTPS format for easier parsing
    if (cleanUrl.startsWith('git@github.com:')) {
      cleanUrl = cleanUrl.replace('git@github.com:', 'https://github.com/')
    }
    
    // Parse the URL
    const match = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    
    if (!match) {
      throw new Error(`Invalid GitHub URL: ${githubUrl}`)
    }
    
    return {
      owner: match[1],
      repo: match[2]
    }
  }

  async searchRepositories(query: string): Promise<any[]> {
    const url = `${this.apiBase}/search/repositories?q=${encodeURIComponent(query)}`
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'homework-tracker-scoring'
    }
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`
    }
    
    try {
      const response = await fetch(url, { headers })
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      
      return data.items || []
    } catch (error) {
      console.error('Error searching repositories:', error)
      return []
    }
  }

  async getRateLimitStatus(): Promise<any> {
    const url = `${this.apiBase}/rate_limit`
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'homework-tracker-scoring'
    }
    
    if (this.token) {
      headers['Authorization'] = `token ${this.token}`
    }
    
    try {
      const response = await fetch(url, { headers })
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`)
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching rate limit:', error)
      return null
    }
  }
}