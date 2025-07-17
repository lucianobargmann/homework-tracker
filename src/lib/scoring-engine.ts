// Main Scoring Engine for AI Challenge Evaluation
// File: /src/lib/scoring-engine.ts

import { ScoringEvaluators } from './scoring-evaluators'
import { RepositoryAnalyzer } from './repository-analyzer'

export interface ScoringReport {
  totalScore: number
  maxScore: number
  percentage: number
  categories: CategoryScore[]
  recommendations: string[]
  timestamp: string
}

export interface CategoryScore {
  category: string
  score: number
  maxScore: number
  percentage: number
  subcategories: SubcategoryScore[]
}

export interface SubcategoryScore {
  name: string
  score: number
  maxScore: number
  feedback: string
  evidence: string[]
}

export class ScoringEngine {
  private evaluators: ScoringEvaluators
  private analyzer: RepositoryAnalyzer

  constructor() {
    this.evaluators = new ScoringEvaluators()
    this.analyzer = new RepositoryAnalyzer()
  }

  async scoreRepository(githubUrl: string, promptsText?: string): Promise<ScoringReport> {
    try {
      console.log(`🏆 Starting scoring process for: ${githubUrl}`)
      const startTime = Date.now()
      
      // Step 1: Download and analyze repository
      console.log(`📖 Step 1: Analyzing repository structure...`)
      const repoAnalysis = await this.analyzer.analyzeFromGitHub(githubUrl)
      console.log(`✅ Repository analysis completed. Languages: ${repoAnalysis.codeAnalysis.languages.join(', ')}`)
      console.log(`🔧 Frameworks detected: ${repoAnalysis.codeAnalysis.frameworks.join(', ')}`)
      
      // Step 2: Use provided prompts or extract from repo
      const prompts = promptsText || repoAnalysis.promptsFile
      console.log(`📝 Step 2: Prompts ${prompts ? 'found' : 'not found'} - Length: ${prompts?.length || 0} characters`)
      
      // Step 3: Evaluate all categories
      console.log(`🖼️ Step 3: Evaluating scoring categories...`)
      const categories = await this.evaluateAllCategories(repoAnalysis, prompts)
      
      // Step 4: Calculate totals
      console.log(`🧮 Step 4: Calculating final scores...`)
      const totalScore = categories.reduce((sum, cat) => sum + cat.score, 0)
      const maxScore = categories.reduce((sum, cat) => sum + cat.maxScore, 0)
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0
      
      console.log(`📊 Scoring summary:`)
      categories.forEach(cat => {
        console.log(`   - ${cat.category}: ${cat.score}/${cat.maxScore} (${cat.percentage.toFixed(1)}%)`)
      })
      
      // Step 5: Generate recommendations
      console.log(`💡 Step 5: Generating recommendations...`)
      const recommendations = this.generateRecommendations(categories)
      
      const totalTime = Date.now() - startTime
      console.log(`✅ Scoring completed in ${totalTime}ms. Final score: ${totalScore}/${maxScore} (${percentage.toFixed(1)}%)`)
      
      return {
        totalScore,
        maxScore,
        percentage,
        categories,
        recommendations,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ Error scoring repository:', error)
      throw error
    }
  }

  private async evaluateAllCategories(
    analysis: any, 
    prompts: string | null
  ): Promise<CategoryScore[]> {
    const categories: CategoryScore[] = []

    // 1. Prompt Quality (100 points)
    categories.push({
      category: 'Prompt Quality',
      ...this.evaluatePromptQuality(prompts),
      maxScore: 100
    })

    // 2. AI Tool Orchestration (55 points)
    categories.push({
      category: 'AI Tool Orchestration',
      ...this.evaluateAIOrchestration(analysis),
      maxScore: 55
    })

    // 3. System Integration (110 points)
    categories.push({
      category: 'System Integration',
      ...this.evaluateSystemIntegration(analysis),
      maxScore: 110
    })

    // 4. End-to-End Functionality (25 points)
    categories.push({
      category: 'End-to-End Functionality',
      ...this.evaluateEndToEnd(analysis),
      maxScore: 25
    })

    // 5. Reasoning Trace (25 points)
    categories.push({
      category: 'Reasoning Trace',
      ...this.evaluateReasoningTrace(analysis),
      maxScore: 25
    })

    // Calculate percentages for each category
    categories.forEach(cat => {
      cat.percentage = cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 0
    })

    return categories
  }

  private evaluatePromptQuality(prompts: string | null): Omit<CategoryScore, 'category' | 'maxScore'> {
    const subcategories: SubcategoryScore[] = []

    // Structure (25 points)
    const structure = this.evaluators.evaluatePromptStructure(prompts)
    subcategories.push({
      name: 'Structure & Organization',
      score: structure.score,
      maxScore: 25,
      feedback: structure.feedback,
      evidence: structure.evidence
    })

    // Layered Prompting (20 points)
    const layered = this.evaluators.evaluateLayeredPrompting(prompts)
    subcategories.push({
      name: 'Layered Prompting',
      score: layered.score,
      maxScore: 20,
      feedback: layered.feedback,
      evidence: layered.evidence
    })

    // Context Management (15 points)
    const context = this.evaluators.evaluateContextManagement(prompts)
    subcategories.push({
      name: 'Context Management',
      score: context.score,
      maxScore: 15,
      feedback: context.feedback,
      evidence: context.evidence
    })

    // Iterative Refinement (15 points)
    const refinement = this.evaluators.evaluateIterativeRefinement(prompts)
    subcategories.push({
      name: 'Iterative Refinement',
      score: refinement.score,
      maxScore: 15,
      feedback: refinement.feedback,
      evidence: refinement.evidence
    })

    // Technical Specificity (25 points)
    const specificity = this.evaluators.evaluateTechnicalSpecificity(prompts)
    subcategories.push({
      name: 'Technical Specificity',
      score: specificity.score,
      maxScore: 25,
      feedback: specificity.feedback,
      evidence: specificity.evidence
    })

    const totalScore = subcategories.reduce((sum, sub) => sum + sub.score, 0)
    return {
      score: totalScore,
      percentage: 0, // Will be calculated later
      subcategories
    }
  }

  private evaluateAIOrchestration(analysis: any): Omit<CategoryScore, 'category' | 'maxScore'> {
    const subcategories: SubcategoryScore[] = []

    // Tool Diversity (30 points)
    const diversity = this.evaluators.evaluateToolDiversity(analysis)
    subcategories.push({
      name: 'Tool Diversity',
      score: diversity.score,
      maxScore: 30,
      feedback: diversity.feedback,
      evidence: diversity.evidence
    })

    // Workflow Integration (25 points)
    const workflow = this.evaluators.evaluateWorkflowIntegration(analysis)
    subcategories.push({
      name: 'Workflow Integration',
      score: workflow.score,
      maxScore: 25,
      feedback: workflow.feedback,
      evidence: workflow.evidence
    })

    const totalScore = subcategories.reduce((sum, sub) => sum + sub.score, 0)
    return {
      score: totalScore,
      percentage: 0,
      subcategories
    }
  }

  private evaluateSystemIntegration(analysis: any): Omit<CategoryScore, 'category' | 'maxScore'> {
    const subcategories: SubcategoryScore[] = []

    // Database (30 points)
    const database = this.evaluators.evaluateDatabase(analysis)
    subcategories.push({
      name: 'Database Implementation',
      score: database.score,
      maxScore: 30,
      feedback: database.feedback,
      evidence: database.evidence
    })

    // Backend API (30 points)
    const backend = this.evaluators.evaluateBackendAPI(analysis)
    subcategories.push({
      name: 'Backend API',
      score: backend.score,
      maxScore: 30,
      feedback: backend.feedback,
      evidence: backend.evidence
    })

    // Frontend (25 points)
    const frontend = this.evaluators.evaluateFrontend(analysis)
    subcategories.push({
      name: 'Frontend Implementation',
      score: frontend.score,
      maxScore: 25,
      feedback: frontend.feedback,
      evidence: frontend.evidence
    })

    // Mobile (25 points)
    const mobile = this.evaluators.evaluateMobile(analysis)
    subcategories.push({
      name: 'Mobile Implementation',
      score: mobile.score,
      maxScore: 25,
      feedback: mobile.feedback,
      evidence: mobile.evidence
    })

    const totalScore = subcategories.reduce((sum, sub) => sum + sub.score, 0)
    return {
      score: totalScore,
      percentage: 0,
      subcategories
    }
  }

  private evaluateEndToEnd(analysis: any): Omit<CategoryScore, 'category' | 'maxScore'> {
    const subcategories: SubcategoryScore[] = []

    // For now, create a simple end-to-end evaluation
    // This would need to be expanded with actual functional testing
    let score = 0
    const evidence: string[] = []

    // Check for complete application structure
    if (analysis.files.some((f: any) => f.path.includes('package.json'))) {
      score += 10
      evidence.push("Has package.json indicating complete application")
    }

    // Check for deployment files
    if (analysis.files.some((f: any) => f.path.includes('docker') || f.path.includes('deploy'))) {
      score += 10
      evidence.push("Includes deployment configuration")
    }

    // Check for testing
    if (analysis.codeAnalysis.hasTests) {
      score += 5
      evidence.push("Includes testing implementation")
    }

    const feedback = score >= 20 ? "Excellent end-to-end implementation" :
                    score >= 15 ? "Good end-to-end implementation" :
                    score >= 10 ? "Basic end-to-end implementation" :
                    "Poor end-to-end implementation"

    subcategories.push({
      name: 'End-to-End Functionality',
      score,
      maxScore: 25,
      feedback,
      evidence
    })

    return {
      score,
      percentage: 0,
      subcategories
    }
  }

  private evaluateReasoningTrace(analysis: any): Omit<CategoryScore, 'category' | 'maxScore'> {
    const subcategories: SubcategoryScore[] = []

    const trace = this.evaluators.evaluateReasoningTrace(analysis)
    subcategories.push({
      name: 'Reasoning Documentation',
      score: trace.score,
      maxScore: 25,
      feedback: trace.feedback,
      evidence: trace.evidence
    })

    return {
      score: trace.score,
      percentage: 0,
      subcategories
    }
  }

  private generateRecommendations(categories: CategoryScore[]): string[] {
    const recommendations: string[] = []

    categories.forEach(category => {
      if (category.percentage < 50) {
        recommendations.push(`Improve ${category.category} (${category.percentage.toFixed(1)}%)`)
      }

      category.subcategories.forEach(sub => {
        const subPercentage = sub.maxScore > 0 ? (sub.score / sub.maxScore) * 100 : 0
        if (subPercentage < 30) {
          recommendations.push(`Focus on ${sub.name} - ${sub.feedback}`)
        }
      })
    })

    // Generic recommendations based on overall performance
    const totalPercentage = categories.reduce((sum, cat) => sum + cat.percentage, 0) / categories.length
    
    if (totalPercentage < 40) {
      recommendations.push("Consider reviewing the assignment requirements more carefully")
      recommendations.push("Focus on documenting your AI prompting strategy")
    } else if (totalPercentage < 70) {
      recommendations.push("Good progress! Focus on technical implementation details")
      recommendations.push("Consider adding more comprehensive testing")
    }

    return recommendations.slice(0, 8) // Limit to most important recommendations
  }
}