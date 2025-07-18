// AI Challenge Scoring Implementation
// Based on SCORING.md criteria - evaluates ability to use AI for production systems

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
  content?: string
}

interface CodeAnalysis {
  languages: string[]
  frameworks: string[]
  hasTests: boolean
  hasDocumentation: boolean
  codeQuality: number
  hasMobileApp: boolean
  mobileType?: 'ios' | 'android' | 'cross-platform' | 'none'
  hasDatabase: boolean
  hasBackendAPI: boolean
}

export class ScoringEvaluators {
  
  // ========== 1. PROMPT QUALITY (100 points) ==========
  
  // 1.1 Prompt Structure & Organization (25 points)
  evaluatePromptStructure(promptsFile: string | null): EvaluationResult {
    if (!promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file found - missing critical documentation",
        evidence: []
      }
    }

    const lines = promptsFile.split('\n')
    let score = 0
    const evidence: string[] = []

    // Check for headers/sections (8 points)
    const hasHeaders = lines.some(line => line.match(/^#+\s/) || line.match(/^[A-Z][A-Z\s]+:$/))
    const hasNumbering = lines.some(line => line.match(/^\d+[\.)]\s/))
    const hasSections = lines.filter(line => 
      line.toLowerCase().includes('database') || 
      line.toLowerCase().includes('api') || 
      line.toLowerCase().includes('mobile')
    ).length >= 2
    
    if (hasHeaders || hasNumbering) {
      score += 8
      evidence.push("Uses clear headers or numbering for organization")
    } else if (hasSections) {
      score += 4
      evidence.push("Shows some section organization")
    }

    // Check for logical progression (8 points)
    const setupFirst = this.checkLogicalProgression(lines)
    if (setupFirst) {
      score += 8
      evidence.push("Logical progression from setup to implementation")
    }

    // Check for component separation (9 points)
    const hasDBPrompts = lines.some(line => line.toLowerCase().includes('database') || line.toLowerCase().includes('schema'))
    const hasAPIPrompts = lines.some(line => line.toLowerCase().includes('api') || line.toLowerCase().includes('backend'))
    const hasMobilePrompts = lines.some(line => line.toLowerCase().includes('mobile') || line.toLowerCase().includes('ios') || line.toLowerCase().includes('android'))
    
    const componentCount = [hasDBPrompts, hasAPIPrompts, hasMobilePrompts].filter(Boolean).length
    score += componentCount * 3
    if (componentCount > 0) {
      evidence.push(`Clear separation of ${componentCount} components`)
    }

    const feedback = score >= 20 ? "Excellent prompt structure and organization" :
                    score >= 15 ? "Good prompt organization" :
                    score >= 10 ? "Fair prompt structure" :
                    "Poor organization - prompts lack clear structure"

    return { score: Math.min(score, 25), feedback, evidence }
  }

  // 1.2 Technical Specification (25 points)
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
    const lower = promptsFile.toLowerCase()

    // Specific technologies mentioned (10 points)
    const dbTech = ['sqlite', 'postgresql', 'mysql', 'mongodb', 'firebase', 'supabase']
    const apiTech = ['express', 'fastapi', 'django', 'rails', 'nest', 'spring']
    const mobileTech = ['swift', 'swiftui', 'kotlin', 'jetpack compose', 'uikit', 'android studio']
    
    const mentionedDB = dbTech.filter(tech => lower.includes(tech))
    const mentionedAPI = apiTech.filter(tech => lower.includes(tech))
    const mentionedMobile = mobileTech.filter(tech => lower.includes(tech))
    
    const techScore = Math.min(10, (mentionedDB.length + mentionedAPI.length + mentionedMobile.length) * 3)
    score += techScore
    
    if (mentionedDB.length > 0) evidence.push(`Specifies database: ${mentionedDB.join(', ')}`)
    if (mentionedAPI.length > 0) evidence.push(`Specifies API framework: ${mentionedAPI.join(', ')}`)
    if (mentionedMobile.length > 0) evidence.push(`Specifies mobile platform: ${mentionedMobile.join(', ')}`)

    // Data models and API endpoints (8 points)
    const hasDataModels = lower.includes('model') || lower.includes('schema') || lower.includes('table')
    const hasEndpoints = lower.includes('endpoint') || lower.includes('route') || lower.includes('api')
    const hasUIComponents = lower.includes('screen') || lower.includes('view') || lower.includes('component')
    
    if (hasDataModels) {
      score += 3
      evidence.push("Includes data model specifications")
    }
    if (hasEndpoints) {
      score += 3
      evidence.push("Specifies API endpoints")
    }
    if (hasUIComponents) {
      score += 2
      evidence.push("Mentions UI components")
    }

    // Security and error handling (7 points)
    const hasSecurity = lower.includes('auth') || lower.includes('security') || lower.includes('token')
    const hasErrorHandling = lower.includes('error') || lower.includes('validation') || lower.includes('exception')
    
    if (hasSecurity) {
      score += 4
      evidence.push("Addresses authentication/security")
    }
    if (hasErrorHandling) {
      score += 3
      evidence.push("Considers error handling")
    }

    const feedback = score >= 20 ? "Excellent technical specificity" :
                    score >= 15 ? "Good technical details" :
                    score >= 10 ? "Fair technical specification" :
                    "Lacks technical specifics"

    return { score: Math.min(score, 25), feedback, evidence }
  }

  // 1.3 Feature Coverage (25 points)
  evaluateFeatureCoverage(promptsFile: string | null): EvaluationResult {
    if (!promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file to evaluate feature coverage",
        evidence: []
      }
    }

    let score = 0
    const evidence: string[] = []
    const lower = promptsFile.toLowerCase()

    // Required features (5 points each)
    const features = [
      { name: 'Voting session creation', keywords: ['session', 'create', 'poll', 'question'] },
      { name: 'Vote casting', keywords: ['vote', 'cast', 'submit', 'choice'] },
      { name: 'Results display', keywords: ['result', 'count', 'tally', 'display'] },
      { name: 'Duplicate prevention', keywords: ['duplicate', 'prevent', 'unique', 'once'] },
      { name: 'User authentication', keywords: ['auth', 'login', 'user', 'identity'] }
    ]

    features.forEach(feature => {
      const hasFeature = feature.keywords.some(keyword => lower.includes(keyword))
      if (hasFeature) {
        score += 5
        evidence.push(`Covers: ${feature.name}`)
      }
    })

    const feedback = score >= 20 ? "All features thoroughly covered" :
                    score >= 15 ? "Most features covered" :
                    score >= 10 ? "Basic features covered" :
                    "Missing key features"

    return { score: Math.min(score, 25), feedback, evidence }
  }

  // 1.4 Problem-Solving Approach (25 points)
  evaluateIterativeRefinement(promptsFile: string | null): EvaluationResult {
    if (!promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file to evaluate problem-solving approach",
        evidence: []
      }
    }

    let score = 0
    const evidence: string[] = []
    const lines = promptsFile.split('\n')
    const lower = promptsFile.toLowerCase()

    // Error handling prompts (7 points)
    const errorKeywords = ['error', 'fix', 'debug', 'issue', 'problem', 'handle']
    const errorCount = errorKeywords.filter(keyword => lower.includes(keyword)).length
    if (errorCount >= 3) {
      score += 7
      evidence.push("Strong focus on error handling")
    } else if (errorCount >= 1) {
      score += 4
      evidence.push("Some error handling consideration")
    }

    // Testing and validation (6 points)
    const testKeywords = ['test', 'validate', 'verify', 'check', 'ensure']
    const hasTestingFocus = testKeywords.some(keyword => lower.includes(keyword))
    if (hasTestingFocus) {
      score += 6
      evidence.push("Includes testing/validation approach")
    }

    // Performance optimization (6 points)
    const perfKeywords = ['performance', 'optimize', 'efficient', 'scale', 'improve']
    const hasPerfConsideration = perfKeywords.some(keyword => lower.includes(keyword))
    if (hasPerfConsideration) {
      score += 6
      evidence.push("Considers performance optimization")
    }

    // Security considerations (6 points)
    const securityKeywords = ['security', 'secure', 'protect', 'sanitize', 'validate']
    const hasSecurityFocus = securityKeywords.some(keyword => lower.includes(keyword))
    if (hasSecurityFocus) {
      score += 6
      evidence.push("Addresses security concerns")
    }

    const feedback = score >= 20 ? "Excellent iterative problem-solving" :
                    score >= 15 ? "Good problem-solving approach" :
                    score >= 10 ? "Basic problem-solving" :
                    "Limited problem-solving evidence"

    return { score: Math.min(score, 25), feedback, evidence }
  }

  // ========== 2. AI TOOL ORCHESTRATION (55 points) ==========

  // 2.1 Effective AI Usage (30 points)
  evaluateAIOrchestration(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    if (!analysis.promptsFile) {
      return {
        score: 0,
        feedback: "No prompts file to evaluate AI orchestration",
        evidence: []
      }
    }

    const prompts = analysis.promptsFile.split(/\n\n+/).filter(p => p.trim())
    
    // Progressive complexity (10 points)
    if (prompts.length >= 5) {
      score += 10
      evidence.push(`Shows progressive approach with ${prompts.length} distinct prompts`)
    } else if (prompts.length >= 3) {
      score += 7
      evidence.push(`Moderate progression with ${prompts.length} prompts`)
    } else if (prompts.length >= 2) {
      score += 4
      evidence.push(`Limited progression with ${prompts.length} prompts`)
    }

    // Context preservation (10 points)
    const contextWords = ['previous', 'above', 'earlier', 'continue', 'based on', 'using the']
    const hasContext = contextWords.some(word => analysis.promptsFile!.toLowerCase().includes(word))
    if (hasContext) {
      score += 10
      evidence.push("Good context preservation across prompts")
    }

    // Appropriate prompt sizing (10 points)
    const avgPromptLength = prompts.reduce((sum, p) => sum + p.length, 0) / prompts.length
    if (avgPromptLength > 100 && avgPromptLength < 500) {
      score += 10
      evidence.push("Optimal prompt sizing - not too long or short")
    } else if (avgPromptLength > 50 && avgPromptLength < 1000) {
      score += 6
      evidence.push("Reasonable prompt sizing")
    }

    const feedback = score >= 25 ? "Masterful AI orchestration" :
                    score >= 19 ? "Effective AI usage" :
                    score >= 13 ? "Basic AI usage" :
                    "Ineffective AI usage"

    return { score: Math.min(score, 30), feedback, evidence }
  }

  // 2.2 Code Generation Strategy (25 points)
  evaluateWorkflowIntegration(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Component-based approach (10 points)
    const hasDBFiles = analysis.files.some(f => 
      f.path.includes('schema') || f.path.includes('model') || f.path.includes('database'))
    const hasAPIFiles = analysis.files.some(f => 
      f.path.includes('api') || f.path.includes('route') || f.path.includes('controller'))
    const hasMobileFiles = analysis.files.some(f => 
      f.extension === 'swift' || f.extension === 'kt' || f.extension === 'java')
    
    const componentCount = [hasDBFiles, hasAPIFiles, hasMobileFiles].filter(Boolean).length
    score += componentCount * 3.5
    evidence.push(`Generated ${componentCount} distinct components`)

    // Building on previous outputs (8 points)
    if (analysis.promptsFile) {
      const buildingWords = ['now', 'next', 'then', 'add', 'modify', 'update']
      const hasBuildingApproach = buildingWords.some(word => 
        analysis.promptsFile!.toLowerCase().includes(word))
      if (hasBuildingApproach) {
        score += 8
        evidence.push("Shows iterative building approach")
      }
    }

    // File structure organization (7 points)
    const wellOrganized = this.checkProjectStructure(analysis.files)
    if (wellOrganized.score >= 7) {
      score += 7
      evidence.push("Well-organized file structure")
    } else if (wellOrganized.score >= 4) {
      score += 4
      evidence.push("Basic file organization")
    }

    const feedback = score >= 20 ? "Clear component-based strategy" :
                    score >= 15 ? "Good separation of concerns" :
                    score >= 10 ? "Some strategic thinking" :
                    "No clear strategy"

    return { score: Math.min(score, 25), feedback, evidence }
  }

  // ========== 3. SYSTEM INTEGRATION (110 points) ==========

  // 3.1 Database Implementation (30 points)
  evaluateDatabase(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Schema/model definitions (12 points)
    const schemaFiles = analysis.files.filter(f => 
      f.path.includes('schema') || 
      f.path.includes('model') || 
      f.path.includes('migration') ||
      f.path.includes('.sql') ||
      (f.path.includes('prisma') && f.extension === 'prisma')
    )
    
    if (schemaFiles.length >= 2) {
      score += 12
      evidence.push(`Found ${schemaFiles.length} schema/model files`)
    } else if (schemaFiles.length === 1) {
      score += 8
      evidence.push("Found database schema definition")
    }

    // Proper relationships (6 points)
    const hasRelationships = analysis.files.some(f => 
      f.content?.includes('foreign key') ||
      f.content?.includes('references') ||
      f.content?.includes('belongsTo') ||
      f.content?.includes('hasMany')
    )
    if (hasRelationships) {
      score += 6
      evidence.push("Database includes proper relationships")
    }

    // Connection configuration (6 points)
    const hasDBConfig = analysis.files.some(f => 
      f.path.includes('database') && (f.path.includes('config') || f.path.includes('connection'))
    )
    if (hasDBConfig) {
      score += 6
      evidence.push("Database connection properly configured")
    }

    // Data validation (6 points)
    const hasValidation = analysis.codeAnalysis.hasDatabase
    if (hasValidation) {
      score += 6
      evidence.push("Database implementation detected")
    }

    const feedback = score >= 25 ? "Complete, well-designed database" :
                    score >= 19 ? "Good database with minor issues" :
                    score >= 13 ? "Basic database functionality" :
                    "Incomplete or poor database"

    return { score: Math.min(score, 30), feedback, evidence }
  }

  // 3.2 Backend API (30 points)
  evaluateBackendAPI(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // API endpoints (12 points)
    const apiFiles = analysis.files.filter(f => 
      f.path.includes('route') || 
      f.path.includes('controller') || 
      f.path.includes('handler') ||
      f.path.includes('api')
    )
    
    if (apiFiles.length >= 4) {
      score += 12
      evidence.push(`Found ${apiFiles.length} API endpoint files`)
    } else if (apiFiles.length >= 2) {
      score += 8
      evidence.push(`Found ${apiFiles.length} API endpoint files`)
    } else if (apiFiles.length >= 1) {
      score += 4
      evidence.push("Found basic API endpoints")
    }

    // HTTP methods and status codes (6 points)
    const hasProperHTTP = analysis.codeAnalysis.hasBackendAPI
    if (hasProperHTTP) {
      score += 6
      evidence.push("Backend API implementation detected")
    }

    // Request/response validation (6 points)
    const hasValidation = analysis.files.some(f => 
      f.path.includes('validation') || 
      f.path.includes('middleware') ||
      f.content?.includes('validate')
    )
    if (hasValidation) {
      score += 6
      evidence.push("Includes request validation")
    }

    // Authentication implementation (6 points)
    const hasAuth = analysis.files.some(f => 
      f.path.includes('auth') || 
      f.content?.includes('authenticate') ||
      f.content?.includes('jwt') ||
      f.content?.includes('session')
    )
    if (hasAuth) {
      score += 6
      evidence.push("Authentication implemented")
    }

    const feedback = score >= 25 ? "Production-ready API" :
                    score >= 19 ? "Well-implemented API" :
                    score >= 13 ? "Functional API with issues" :
                    "Incomplete or poor API"

    return { score: Math.min(score, 30), feedback, evidence }
  }

  // 3.3 Mobile Implementation (25 points)
  evaluateMobile(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Check for native mobile app
    const iosFiles = analysis.files.filter(f => 
      f.extension === 'swift' || f.path.includes('.xcodeproj') || f.path.includes('Info.plist')
    )
    const androidFiles = analysis.files.filter(f => 
      f.extension === 'kt' || f.extension === 'java' || f.path.includes('gradle')
    )

    // Native implementation check (15 points)
    if (iosFiles.length > 5) {
      score += 15
      evidence.push(`Native iOS app with ${iosFiles.length} Swift files`)
    } else if (androidFiles.length > 5) {
      score += 15
      evidence.push(`Native Android app with ${androidFiles.length} Kotlin/Java files`)
    } else if (iosFiles.length > 0 || androidFiles.length > 0) {
      score += 8
      evidence.push("Basic native mobile implementation")
    }

    // Deduct points for cross-platform
    const hasCrossPlatform = analysis.files.some(f => 
      f.path.includes('react-native') || 
      f.path.includes('flutter') ||
      f.path.includes('expo')
    )
    if (hasCrossPlatform) {
      score = Math.max(0, score - 5)
      evidence.push("⚠️ Uses cross-platform framework (not native)")
    }

    // UI components (5 points)
    const hasUIComponents = analysis.codeAnalysis.hasMobileApp
    if (hasUIComponents) {
      score += 5
      evidence.push("Mobile UI components detected")
    }

    // API integration (5 points)
    const hasAPIIntegration = analysis.files.some(f => 
      (f.extension === 'swift' || f.extension === 'kt') && 
      (f.content?.includes('URLSession') || f.content?.includes('Retrofit') || f.content?.includes('fetch'))
    )
    if (hasAPIIntegration) {
      score += 5
      evidence.push("Mobile app integrates with API")
    }

    const feedback = score >= 20 ? "Native app with good UX" :
                    score >= 15 ? "Functional native app" :
                    score >= 10 ? "Basic native app" :
                    "Non-native or incomplete"

    return { score: Math.min(score, 25), feedback, evidence }
  }

  // 3.4 Integration Quality (25 points)
  evaluateFrontend(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // API calls from mobile app (10 points)
    const hasAPICalls = analysis.files.some(f => 
      (f.extension === 'swift' || f.extension === 'kt') &&
      (f.content?.includes('api') || f.content?.includes('http') || f.content?.includes('request'))
    )
    if (hasAPICalls) {
      score += 10
      evidence.push("Mobile app makes API calls")
    }

    // Data flow between layers (8 points)
    const hasModels = analysis.files.filter(f => 
      f.path.includes('model') || f.content?.includes('struct') || f.content?.includes('class')
    ).length >= 3
    if (hasModels) {
      score += 8
      evidence.push("Consistent data models across layers")
    }

    // Error handling across layers (7 points)
    const hasErrorHandling = analysis.files.some(f => 
      f.content?.includes('try') || f.content?.includes('catch') || f.content?.includes('error')
    )
    if (hasErrorHandling) {
      score += 7
      evidence.push("Error handling implemented")
    }

    const feedback = score >= 20 ? "Seamless integration between components" :
                    score >= 15 ? "Good integration quality" :
                    score >= 10 ? "Basic integration" :
                    "Poor or no integration"

    // Using the integration quality scoring for the "Frontend" method
    return { score: Math.min(score, 25), feedback, evidence }
  }

  // ========== 4. END-TO-END FUNCTIONALITY (25 points) ==========
  
  evaluateEndToEnd(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Project structure (10 points)
    const structure = this.checkProjectStructure(analysis.files)
    if (structure.score >= 8) {
      score += 10
      evidence.push("Well-organized project structure")
    } else if (structure.score >= 5) {
      score += 6
      evidence.push("Decent project organization")
    } else if (structure.score >= 3) {
      score += 3
      evidence.push("Basic project structure")
    }

    // Code quality indicators (10 points)
    if (analysis.codeAnalysis.codeQuality >= 7) {
      score += 10
      evidence.push("High code quality detected")
    } else if (analysis.codeAnalysis.codeQuality >= 5) {
      score += 6
      evidence.push("Good code quality")
    } else if (analysis.codeAnalysis.codeQuality >= 3) {
      score += 3
      evidence.push("Basic code quality")
    }

    // Documentation (5 points)
    if (analysis.readmeFile) {
      score += 3
      evidence.push("README documentation present")
    }
    if (analysis.codeAnalysis.hasDocumentation) {
      score += 2
      evidence.push("Additional documentation found")
    }

    const feedback = score >= 20 ? "Excellent end-to-end implementation" :
                    score >= 15 ? "Good overall implementation" :
                    score >= 10 ? "Basic implementation" :
                    "Poor implementation quality"

    return { score: Math.min(score, 25), feedback, evidence }
  }

  // ========== 5. REASONING TRACE (25 points) ==========
  
  evaluateReasoningTrace(analysis: RepositoryAnalysis): EvaluationResult {
    let score = 0
    const evidence: string[] = []

    // Technical decisions documented (15 points)
    if (analysis.readmeFile) {
      const readme = analysis.readmeFile.toLowerCase()
      
      // Technology choices explained (5 points)
      if (readme.includes('chose') || readme.includes('selected') || readme.includes('decided')) {
        score += 5
        evidence.push("Documents technology choices")
      }
      
      // Architecture decisions (5 points)
      if (readme.includes('architecture') || readme.includes('structure') || readme.includes('design')) {
        score += 5
        evidence.push("Explains architecture decisions")
      }
      
      // Trade-offs considered (5 points)
      if (readme.includes('trade-off') || readme.includes('pros') || readme.includes('cons')) {
        score += 5
        evidence.push("Considers trade-offs")
      }
    }

    // Problem documentation (10 points)
    if (analysis.promptsFile) {
      const prompts = analysis.promptsFile.toLowerCase()
      
      // Challenges encountered (5 points)
      if (prompts.includes('issue') || prompts.includes('problem') || prompts.includes('challenge')) {
        score += 5
        evidence.push("Documents challenges encountered")
      }
      
      // Solutions implemented (5 points)
      if (prompts.includes('fix') || prompts.includes('solve') || prompts.includes('solution')) {
        score += 5
        evidence.push("Documents solutions implemented")
      }
    }

    const feedback = score >= 20 ? "Excellent reasoning documentation" :
                    score >= 15 ? "Good technical reasoning" :
                    score >= 10 ? "Basic reasoning trace" :
                    "Limited reasoning documentation"

    return { score: Math.min(score, 25), feedback, evidence }
  }

  // Helper Methods
  
  private checkLogicalProgression(lines: string[]): boolean {
    const setupWords = ['setup', 'install', 'create', 'initialize', 'start']
    const implWords = ['implement', 'add', 'build', 'develop']
    
    let setupIndex = -1
    let implIndex = -1
    
    lines.forEach((line, index) => {
      const lower = line.toLowerCase()
      if (setupIndex === -1 && setupWords.some(word => lower.includes(word))) {
        setupIndex = index
      }
      if (implIndex === -1 && implWords.some(word => lower.includes(word))) {
        implIndex = index
      }
    })
    
    return setupIndex !== -1 && implIndex !== -1 && setupIndex < implIndex
  }

  private checkProjectStructure(files: FileInfo[]): { score: number } {
    let score = 0
    
    // Check for organized directories
    const hasSrcDir = files.some(f => f.path.includes('src/'))
    const hasApiDir = files.some(f => f.path.includes('api/') || f.path.includes('backend/'))
    const hasMobileDir = files.some(f => f.path.includes('ios/') || f.path.includes('android/'))
    const hasDbDir = files.some(f => f.path.includes('database/') || f.path.includes('db/'))
    
    if (hasSrcDir) score += 2
    if (hasApiDir) score += 3
    if (hasMobileDir) score += 3
    if (hasDbDir) score += 2
    
    return { score }
  }

  private checkForModels(files: FileInfo[]): { score: number } {
    const modelFiles = files.filter(f => 
      f.path.includes('model') || 
      f.path.includes('schema') ||
      f.path.includes('entity')
    )
    
    return { score: Math.min(10, modelFiles.length * 2) }
  }

  private checkRestfulPatterns(files: FileInfo[]): boolean {
    return files.some(f => 
      f.path.includes('route') || 
      f.path.includes('controller') ||
      f.content?.includes('GET') ||
      f.content?.includes('POST')
    )
  }

  private checkComponentStructure(files: FileInfo[]): { score: number } {
    const componentFiles = files.filter(f => 
      f.path.includes('component') || 
      f.path.includes('view') ||
      f.path.includes('screen')
    )
    
    return { score: Math.min(8, componentFiles.length) }
  }

  // Compatibility methods for scoring engine
  evaluateToolDiversity(analysis: RepositoryAnalysis): EvaluationResult {
    // This is now part of Code Generation Strategy
    return this.evaluateWorkflowIntegration(analysis)
  }

  evaluateLayeredPrompting(promptsFile: string | null): EvaluationResult {
    // This is now part of AI Orchestration
    return this.evaluateAIOrchestration({ promptsFile } as RepositoryAnalysis)
  }

  evaluateContextManagement(promptsFile: string | null): EvaluationResult {
    // This is now part of AI Orchestration
    return this.evaluateAIOrchestration({ promptsFile } as RepositoryAnalysis)
  }
}