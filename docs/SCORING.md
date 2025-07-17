Based on this project and the assignment the candidates must deliver (public/assignment.pdf)
I want an automatic grader that connects to the submitted github, checks the code and evaluates the prompts submitted..

Areas I want to score:
* Prompt quality
* AI tool orchestration
* Backend, database, and frontend integration
* End-to-end functionality on web + mobile
* Reasoning trace (prompts, readme, decisions)

The intent is to select people that can drive AI code gen tools to create Production quality systems.

This is same sample code:
// Comprehensive Evaluation Methods for AI Challenge Scoring
// File: /src/lib/scoring-evaluators.ts

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'

interface EvaluationResult {
  score: number
  feedback: string
  evidence: string[]
}

interface RepositoryAnalysis {
  directory: string
  files: FileInfo[]
  promptsFile: string | null
  readmeFile: string | null
  packageJson: any
  codeAnalysis: CodeAnalysis
}

interface FileInfo {
  path: string
  type: 'file' | 'directory'
  size: number
  extension?: string
}

interface CodeAnalysis {
  languages: string[]
  frameworks: string[]
  hasTests: boolean
  hasDocumentation: boolean
  codeQuality: number
}

export class ScoringEvaluators {
  
  // ========== PROMPT QUALITY EVALUATION ==========
  
  evaluatePromptStructure(promptsFile: string | null): EvaluationResult {
    if (!promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file found - missing critical documentation",
        evidence: []
      }
    }

    const lines = promptsFile.split('\n').filter(line => line.trim())
    let score = 0
    const evidence: string[] = []

    // Check for clear organization (5 points)
    const hasHeaders = lines.some(line => line.match(/^#+\s/))
    const hasNumbering = lines.some(line => line.match(/^\d+\./))
    const hasTimestamps = lines.some(line => line.match(/\d{1,2}:\d{2}/))
    
    if (hasHeaders || hasNumbering || hasTimestamps) {
      score += 5
      evidence.push("Prompts are well-organized with clear structure")
    }

    // Check for prompt clarity (10 points)
    const clearPrompts = lines.filter(line => {
      const lower = line.toLowerCase()
      return lower.includes('create') || lower.includes('implement') || 
             lower.includes('build') || lower.includes('generate') ||
             lower.includes('design') || lower.includes('develop')
    }).length

    if (clearPrompts >= 5) {
      score += 10
      evidence.push(`Found ${clearPrompts} clear, actionable prompts`)
    } else if (clearPrompts >= 3) {
      score += 7
      evidence.push(`Found ${clearPrompts} actionable prompts`)
    } else if (clearPrompts >= 1) {
      score += 3
      evidence.push(`Found ${clearPrompts} actionable prompts`)
    }

    // Check for context and requirements (10 points)
    const contextLines = lines.filter(line => {
      const lower = line.toLowerCase()
      return lower.includes('context') || lower.includes('requirement') ||
             lower.includes('feature') || lower.includes('user') ||
             lower.includes('voting') || lower.includes('database')
    }).length

    if (contextLines >= 3) {
      score += 10
      evidence.push(`Good context setting with ${contextLines} relevant lines`)
    } else if (contextLines >= 1) {
      score += 5
      evidence.push(`Some context provided with ${contextLines} relevant lines`)
    }

    const feedback = score >= 20 ? "Excellent prompt structure and clarity" :
                    score >= 15 ? "Good prompt structure with room for improvement" :
                    score >= 10 ? "Basic prompt structure, needs more clarity" :
                    "Poor prompt structure, lacks organization and clarity"

    return {
      score: Math.min(score, 25),
      feedback,
      evidence
    }
  }

  evaluateLayeredPrompting(promptsFile: string | null): EvaluationResult {
    if (!promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file to evaluate layered approach",
        evidence: []
      }
    }

    const lines = promptsFile.split('\n').filter(line => line.trim())
    let score = 0
    const evidence: string[] = []

    // Check for progressive complexity (8 points)
    const hasProgression = this.checkPromptProgression(lines)
    if (hasProgression) {
      score += 8
      evidence.push("Shows progressive complexity in prompts")
    }

    // Check for follow-up prompts (7 points)
    const followUps = lines.filter(line => {
      const lower = line.toLowerCase()
      return lower.includes('follow up') || lower.includes('also') ||
             lower.includes('now') || lower.includes('next') ||
             lower.includes('then') || lower.includes('after')
    }).length

    if (followUps >= 3) {
      score += 7
      evidence.push(`Found ${followUps} follow-up prompts showing iteration`)
    } else if (followUps >= 1) {
      score += 4
      evidence.push(`Found ${followUps} follow-up prompts`)
    }

    // Check for refinement prompts (5 points)
    const refinements = lines.filter(line => {
      const lower = line.toLowerCase()
      return lower.includes('improve') || lower.includes('fix') ||
             lower.includes('enhance') || lower.includes('optimize') ||
             lower.includes('better') || lower.includes('refactor')
    }).length

    if (refinements >= 2) {
      score += 5
      evidence.push(`Found ${refinements} refinement prompts`)
    } else if (refinements >= 1) {
      score += 3
      evidence.push(`Found ${refinements} refinement prompts`)
    }

    const feedback = score >= 15 ? "Excellent layered prompting approach" :
                    score >= 10 ? "Good use of layered prompting" :
                    score >= 5 ? "Basic layered approach" :
                    "Lacks layered prompting strategy"

    return {
      score: Math.min(score, 20),
      feedback,
      evidence
    }
  }

  evaluateContextManagement(promptsFile: string | null): EvaluationResult {
    if (!promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file to evaluate context management",
        evidence: []
      }
    }

    let score = 0
    const evidence: string[] = []

    // Check for context preservation (8 points)
    const hasContext = promptsFile.toLowerCase().includes('context') ||
                      promptsFile.toLowerCase().includes('remember') ||
                      promptsFile.toLowerCase().includes('previous')
    
    if (hasContext) {
      score += 8
      evidence.push("Shows awareness of context preservation")
    }

    // Check for requirement references (7 points)
    const requirements = ['database', 'api', 'frontend', 'mobile', 'voting', 'feature']
    const mentionedReqs = requirements.filter(req => 
      promptsFile.toLowerCase().includes(req)
    ).length

    if (mentionedReqs >= 4) {
      score += 7
      evidence.push(`References ${mentionedReqs} key requirements`)
    } else if (mentionedReqs >= 2) {
      score += 4
      evidence.push(`References ${mentionedReqs} key requirements`)
    }

    const feedback = score >= 12 ? "Excellent context management" :
                    score >= 8 ? "Good context management" :
                    score >= 4 ? "Basic context management" :
                    "Poor context management"

    return {
      score: Math.min(score, 15),
      feedback,
      evidence
    }
  }

  evaluateIterativeRefinement(promptsFile: string | null): EvaluationResult {
    if (!promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file to evaluate iterative refinement",
        evidence: []
      }
    }

    let score = 0
    const evidence: string[] = []

    // Check for error handling prompts (5 points)
    const errorHandling = promptsFile.toLowerCase().includes('error') ||
                         promptsFile.toLowerCase().includes('fix') ||
                         promptsFile.toLowerCase().includes('debug')
    
    if (errorHandling) {
      score += 5
      evidence.push("Shows error handling and debugging approach")
    }

    // Check for testing prompts (5 points)
    const testing = promptsFile.toLowerCase().includes('test') ||
                   promptsFile.toLowerCase().includes('validate') ||
                   promptsFile.toLowerCase().includes('verify')
    
    if (testing) {
      score += 5
      evidence.push("Includes testing and validation prompts")
    }

    // Check for improvement prompts (5 points)
    const improvements = ['improve', 'optimize', 'enhance', 'better', 'refactor']
    const hasImprovements = improvements.some(word => 
      promptsFile.toLowerCase().includes(word)
    )
    
    if (hasImprovements) {
      score += 5
      evidence.push("Shows iterative improvement approach")
    }

    const feedback = score >= 12 ? "Excellent iterative refinement" :
                    score >= 8 ? "Good iterative approach" :
                    score >= 4 ? "Basic iterative approach" :
                    "Lacks iterative refinement"

    return {
      score: Math.min(score, 15),
      feedback,
      evidence
    }
  }

  evaluateTechnicalSpecificity(promptsFile: string | null): EvaluationResult {
    if (!promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file to evaluate technical specificity",
        evidence: []
      }
    }

    let score = 0
    const evidence: string[] = []

    // Check for specific technologies (10 points)
    const technologies = ['react', 'node', 'express', 'sqlite', 'postgresql', 
                         'mongodb', 'prisma', 'next.js', 'vue', 'angular',
                         'swift', 'kotlin', 'flutter', 'react native']
    
    const mentionedTech = technologies.filter(tech => 
      promptsFile.toLowerCase().includes(tech)
    ).length

    if (mentionedTech >= 4) {
      score += 10
      evidence.push(`Mentions ${mentionedTech} specific technologies`)
    } else if (mentionedTech >= 2) {
      score += 7
      evidence.push(`Mentions ${mentionedTech} specific technologies`)
    } else if (mentionedTech >= 1) {
      score += 4
      evidence.push(`Mentions ${mentionedTech} specific technologies`)
    }

    // Check for API specifications (8 points)
    const apiTerms = ['api', 'endpoint', 'route', 'post', 'get', 'json', 'rest']
    const mentionedAPI = apiTerms.filter(term => 
      promptsFile.toLowerCase().includes(term)
    ).length

    if (mentionedAPI >= 4) {
      score += 8
      evidence.push(`Specific about API design with ${mentionedAPI} terms`)
    } else if (mentionedAPI >= 2) {
      score += 5
      evidence.push(`Some API specificity with ${mentionedAPI} terms`)
    }

    // Check for database specificity (7 points)
    const dbTerms = ['database', 'table', 'schema', 'query', 'model', 'migration']
    const mentionedDB = dbTerms.filter(term => 
      promptsFile.toLowerCase().includes(term)
    ).length

    if (mentionedDB >= 3) {
      score += 7
      evidence.push(`Specific about database design with ${mentionedDB} terms`)
    } else if (mentionedDB >= 1) {
      score += 4
      evidence.push(`Some database specificity with ${mentionedDB} terms`)
    }

    const feedback = score >= 20 ? "Excellent technical specificity" :
                    score >= 15 ? "Good technical specificity" :
                    score >= 10 ? "Basic technical specificity" :
                    "Lacks technical specificity"

    return {
      score: Math.min(score, 25),
      feedback,
      evidence
    }
  }

  // ========== AI ORCHESTRATION EVALUATION ==========

  evaluateToolDiversity(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Check for multiple languages (10 points)
    const languages = analysis.codeAnalysis.languages
    if (languages.length >= 3) {
      score += 10
      evidence.push(`Uses ${languages.length} programming languages: ${languages.join(', ')}`)
    } else if (languages.length >= 2) {
      score += 7
      evidence.push(`Uses ${languages.length} programming languages: ${languages.join(', ')}`)
    } else if (languages.length >= 1) {
      score += 4
      evidence.push(`Uses ${languages.length} programming language: ${languages.join(', ')}`)
    }

    // Check for framework diversity (10 points)
    const frameworks = analysis.codeAnalysis.frameworks
    if (frameworks.length >= 3) {
      score += 10
      evidence.push(`Uses ${frameworks.length} frameworks: ${frameworks.join(', ')}`)
    } else if (frameworks.length >= 2) {
      score += 7
      evidence.push(`Uses ${frameworks.length} frameworks: ${frameworks.join(', ')}`)
    } else if (frameworks.length >= 1) {
      score += 4
      evidence.push(`Uses ${frameworks.length} framework: ${frameworks.join(', ')}`)
    }

    // Check for AI tool mentions in prompts (10 points)
    if (analysis.promptsFile) {
      const aiTools = ['claude', 'gpt', 'copilot', 'chatgpt', 'gemini', 'openai']
      const mentionedTools = aiTools.filter(tool => 
        analysis.promptsFile!.toLowerCase().includes(tool)
      ).length

      if (mentionedTools >= 2) {
        score += 10
        evidence.push(`Mentions ${mentionedTools} AI tools in prompts`)
      } else if (mentionedTools >= 1) {
        score += 6
        evidence.push(`Mentions ${mentionedTools} AI tool in prompts`)
      }
    }

    const feedback = score >= 25 ? "Excellent tool diversity" :
                    score >= 20 ? "Good tool diversity" :
                    score >= 15 ? "Moderate tool diversity" :
                    "Limited tool diversity"

    return {
      score: Math.min(score, 30),
      feedback,
      evidence
    }
  }

  evaluateWorkflowIntegration(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Check for proper project structure (10 points)
    const hasStructure = this.checkProjectStructure(analysis.files)
    if (hasStructure.score >= 8) {
      score += 10
      evidence.push("Excellent project structure")
    } else if (hasStructure.score >= 5) {
      score += 7
      evidence.push("Good project structure")
    } else if (hasStructure.score >= 3) {
      score += 4
      evidence.push("Basic project structure")
    }

    // Check for configuration files (8 points)
    const configFiles = analysis.files.filter(file => 
      file.path.includes('package.json') ||
      file.path.includes('tsconfig.json') ||
      file.path.includes('vite.config') ||
      file.path.includes('next.config') ||
      file.path.includes('webpack.config')
    ).length

    if (configFiles >= 3) {
      score += 8
      evidence.push(`Found ${configFiles} configuration files`)
    } else if (configFiles >= 2) {
      score += 5
      evidence.push(`Found ${configFiles} configuration files`)
    } else if (configFiles >= 1) {
      score += 3
      evidence.push(`Found ${configFiles} configuration file`)
    }

    // Check for development workflow (7 points)
    const hasWorkflow = analysis.files.some(file => 
      file.path.includes('docker') ||
      file.path.includes('github') ||
      file.path.includes('gitlab') ||
      file.path.includes('makefile') ||
      file.path.includes('scripts')
    )

    if (hasWorkflow) {
      score += 7
      evidence.push("Includes development workflow automation")
    }

    const feedback = score >= 20 ? "Excellent workflow integration" :
                    score >= 15 ? "Good workflow integration" :
                    score >= 10 ? "Basic workflow integration" :
                    "Poor workflow integration"

    return {
      score: Math.min(score, 25),
      feedback,
      evidence
    }
  }

  // ========== SYSTEM INTEGRATION EVALUATION ==========

  evaluateDatabase(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Check for database files (15 points)
    const dbFiles = analysis.files.filter(file => 
      file.path.includes('prisma') ||
      file.path.includes('schema') ||
      file.path.includes('migration') ||
      file.path.includes('model') ||
      file.path.includes('database') ||
      file.path.includes('.db') ||
      file.path.includes('sequelize') ||
      file.path.includes('mongoose')
    ).length

    if (dbFiles >= 3) {
      score += 15
      evidence.push(`Found ${dbFiles} database-related files`)
    } else if (dbFiles >= 2) {
      score += 10
      evidence.push(`Found ${dbFiles} database-related files`)
    } else if (dbFiles >= 1) {
      score += 6
      evidence.push(`Found ${dbFiles} database-related file`)
    }

    // Check for models/schemas (10 points)
    const hasModels = this.checkForModels(analysis.files)
    if (hasModels.score >= 8) {
      score += 10
      evidence.push("Well-defined database models")
    } else if (hasModels.score >= 5) {
      score += 7
      evidence.push("Basic database models")
    } else if (hasModels.score >= 3) {
      score += 4
      evidence.push("Minimal database models")
    }

    // Check for database configuration (5 points)
    const hasConfig = analysis.files.some(file => 
      file.path.includes('database.js') ||
      file.path.includes('db.js') ||
      file.path.includes('connection') ||
      file.path.includes('config')
    )

    if (hasConfig) {
      score += 5
      evidence.push("Includes database configuration")
    }

    const feedback = score >= 25 ? "Excellent database implementation" :
                    score >= 20 ? "Good database implementation" :
                    score >= 15 ? "Basic database implementation" :
                    "Poor database implementation"

    return {
      score: Math.min(score, 30),
      feedback,
      evidence
    }
  }

  evaluateBackendAPI(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Check for API files (15 points)
    const apiFiles = analysis.files.filter(file => 
      file.path.includes('api') ||
      file.path.includes('route') ||
      file.path.includes('controller') ||
      file.path.includes('handler') ||
      file.path.includes('endpoint') ||
      file.path.includes('server')
    ).length

    if (apiFiles >= 5) {
      score += 15
      evidence.push(`Found ${apiFiles} API-related files`)
    } else if (apiFiles >= 3) {
      score += 10
      evidence.push(`Found ${apiFiles} API-related files`)
    } else if (apiFiles >= 1) {
      score += 6
      evidence.push(`Found ${apiFiles} API-related file`)
    }

    // Check for RESTful patterns (10 points)
    const hasRestful = this.checkRestfulPatterns(analysis.files)
    if (hasRestful) {
      score += 10
      evidence.push("Follows RESTful API patterns")
    }

    // Check for middleware (5 points)
    const hasMiddleware = analysis.files.some(file => 
      file.path.includes('middleware') ||
      file.path.includes('auth') ||
      file.path.includes('cors') ||
      file.path.includes('validation')
    )

    if (hasMiddleware) {
      score += 5
      evidence.push("Includes middleware implementation")
    }

    const feedback = score >= 25 ? "Excellent API implementation" :
                    score >= 20 ? "Good API implementation" :
                    score >= 15 ? "Basic API implementation" :
                    "Poor API implementation"

    return {
      score: Math.min(score, 30),
      feedback,
      evidence
    }
  }

  evaluateFrontend(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Check for frontend files (12 points)
    const frontendFiles = analysis.files.filter(file => 
      file.path.includes('component') ||
      file.path.includes('page') ||
      file.path.includes('view') ||
      file.path.includes('ui') ||
      file.path.includes('src') ||
      file.extension === 'tsx' ||
      file.extension === 'jsx' ||
      file.extension === 'vue'
    ).length

    if (frontendFiles >= 10) {
      score += 12
      evidence.push(`Found ${frontendFiles} frontend files`)
    } else if (frontendFiles >= 5) {
      score += 8
      evidence.push(`Found ${frontendFiles} frontend files`)
    } else if (frontendFiles >= 3) {
      score += 5
      evidence.push(`Found ${frontendFiles} frontend files`)
    }

    // Check for component structure (8 points)
    const hasComponents = this.checkComponentStructure(analysis.files)
    if (hasComponents.score >= 6) {
      score += 8
      evidence.push("Well-structured components")
    } else if (hasComponents.score >= 4) {
      score += 5
      evidence.push("Basic component structure")
    }