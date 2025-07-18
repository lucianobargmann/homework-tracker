# AI Challenge Scoring System Documentation

## Overview

This document describes the automated scoring system for the AI Challenge, which evaluates candidates' ability to use AI code generation tools to create production-quality systems. The evaluation is based on the assignment in `public/assignment.pdf`.

## Assignment Requirements

The assignment requires candidates to build a **Voting Application** with the following components:

### Required Features
1. **Database** - Persistent storage for voting data
2. **Backend API** - Server-side logic and data management
3. **Mobile Native UI** - iOS or Android native application (NOT web frontend)

### Core Functionality
- Create and manage voting sessions
- Cast votes with user authentication
- Real-time vote counting and results
- Prevent duplicate voting

## Scoring Categories (Total: 315 points)

### 1. Prompt Quality (100 points)

#### 1.1 Prompt Structure & Organization (25 points)
- **Evaluation**: Clear, well-organized prompts with logical flow
- **Evidence Checked**:
  - Use of headers, numbering, or clear sections
  - Logical progression from setup to implementation
  - Clear separation of different components (DB, API, Mobile)
- **Scoring**:
  - Excellent (20-25): Clear sections, numbered steps, logical flow
  - Good (15-19): Some organization, mostly clear
  - Fair (10-14): Basic structure present
  - Poor (0-9): Disorganized, hard to follow

#### 1.2 Technical Specification (25 points)
- **Evaluation**: Specific technical requirements and implementation details
- **Evidence Checked**:
  - Mentions specific technologies (database type, API framework, mobile platform)
  - Includes data models, API endpoints, UI components
  - Specifies authentication, security, and error handling
- **Scoring**:
  - Excellent (20-25): Highly specific with clear technical details
  - Good (15-19): Good technical specificity
  - Fair (10-14): Some technical details
  - Poor (0-9): Vague, lacks technical specifics

#### 1.3 Feature Coverage (25 points)
- **Evaluation**: How well prompts cover all required features
- **Evidence Checked**:
  - Voting session creation
  - Vote casting mechanism
  - Results display
  - Duplicate prevention
  - User authentication
- **Scoring**:
  - Excellent (20-25): All features thoroughly covered
  - Good (15-19): Most features covered well
  - Fair (10-14): Basic features covered
  - Poor (0-9): Missing key features

#### 1.4 Problem-Solving Approach (25 points)
- **Evaluation**: Iterative refinement and error handling
- **Evidence Checked**:
  - Error handling prompts
  - Testing and validation prompts
  - Performance optimization
  - Security considerations
- **Scoring**:
  - Excellent (20-25): Shows iterative problem-solving
  - Good (15-19): Some refinement and error handling
  - Fair (10-14): Basic problem-solving approach
  - Poor (0-9): No evidence of iteration

### 2. AI Tool Orchestration (55 points)

#### 2.1 Effective AI Usage (30 points)
- **Evaluation**: How well the candidate leverages AI capabilities
- **Evidence Checked**:
  - Progressive complexity in prompts (not all at once)
  - Context preservation across prompts
  - Appropriate prompt sizing (not too long, not too short)
  - Clear instructions that AI can follow
- **Scoring**:
  - Excellent (25-30): Masterful AI orchestration
  - Good (19-24): Effective AI usage
  - Fair (13-18): Basic AI usage
  - Poor (0-12): Ineffective AI usage

#### 2.2 Code Generation Strategy (25 points)
- **Evaluation**: Strategic approach to generating different components
- **Evidence Checked**:
  - Separate prompts for database, API, and mobile
  - Building on previous outputs
  - Requesting specific file structures
  - Integration between components
- **Scoring**:
  - Excellent (20-25): Clear component-based strategy
  - Good (15-19): Good separation of concerns
  - Fair (10-14): Some strategic thinking
  - Poor (0-9): No clear strategy

### 3. System Integration (110 points)

#### 3.1 Database Implementation (30 points)
- **Evaluation**: Quality of database design and implementation
- **Evidence Checked**:
  - Schema/model definitions
  - Proper relationships
  - Migrations or setup scripts
  - Connection configuration
  - Data validation
- **Scoring**:
  - Excellent (25-30): Complete, well-designed database
  - Good (19-24): Good database with minor issues
  - Fair (13-18): Basic database functionality
  - Poor (0-12): Incomplete or poor database

#### 3.2 Backend API (30 points)
- **Evaluation**: API design and implementation quality
- **Evidence Checked**:
  - RESTful or GraphQL endpoints
  - Proper HTTP methods and status codes
  - Request/response validation
  - Error handling
  - Authentication implementation
- **Scoring**:
  - Excellent (25-30): Production-ready API
  - Good (19-24): Well-implemented API
  - Fair (13-18): Functional API with issues
  - Poor (0-12): Incomplete or poor API

#### 3.3 Mobile Implementation (25 points)
- **Evaluation**: Native mobile app quality
- **Evidence Checked**:
  - Native iOS (Swift/SwiftUI) or Android (Kotlin)
  - NOT React Native, Flutter, or web views
  - Proper UI components
  - API integration
  - State management
- **Scoring**:
  - Excellent (20-25): Native app with good UX
  - Good (15-19): Functional native app
  - Fair (10-14): Basic native app
  - Poor (0-9): Non-native or incomplete

#### 3.4 Integration Quality (25 points)
- **Evaluation**: How well components work together
- **Evidence Checked**:
  - API calls from mobile app
  - Data flow between layers
  - Error handling across layers
  - Consistent data models
- **Scoring**:
  - Excellent (20-25): Seamless integration
  - Good (15-19): Good integration
  - Fair (10-14): Basic integration
  - Poor (0-9): Poor or no integration

### 4. Code Quality & Best Practices (25 points)

#### 4.1 Project Structure (10 points)
- **Evidence Checked**:
  - Logical file organization
  - Separation of concerns
  - Configuration management
  - Environment handling

#### 4.2 Code Quality (10 points)
- **Evidence Checked**:
  - Clean, readable code
  - Consistent naming conventions
  - Proper error handling
  - No obvious security issues

#### 4.3 Documentation (5 points)
- **Evidence Checked**:
  - README with setup instructions
  - API documentation
  - Code comments where needed

### 5. Reasoning & Decision Making (25 points)

#### 5.1 Technical Decisions (15 points)
- **Evidence Checked**:
  - Technology choices explained
  - Trade-offs considered
  - Architecture decisions documented

#### 5.2 Problem Documentation (10 points)
- **Evidence Checked**:
  - Challenges encountered
  - Solutions implemented
  - Learning demonstrated

## Automatic Scoring Implementation

### Score Calculation
```
Total Score = Prompt Quality + AI Orchestration + System Integration + Code Quality + Reasoning
Percentage = (Total Score / 315) * 100
```

### Grade Boundaries
- **A (90-100%)**: 284-315 points - Production-ready system
- **B (80-89%)**: 252-283 points - Strong implementation
- **C (70-79%)**: 221-251 points - Acceptable implementation
- **D (60-69%)**: 189-220 points - Basic implementation
- **F (Below 60%)**: Below 189 points - Incomplete

## Key Evaluation Principles

1. **Objective Over Subjective**: Focus on measurable criteria (files present, features implemented) rather than subjective quality judgments.

2. **Assignment Alignment**: Score based on actual requirements (mobile native UI, not web frontend).

3. **Production Readiness**: Evaluate if the system could realistically be deployed and used.

4. **AI Tool Mastery**: Assess how effectively the candidate uses AI to generate code, not just the final code quality.

## Common Misconceptions to Avoid

1. **"All projects have package.json"** - Not true for native mobile apps (iOS uses Xcode projects, Android uses Gradle)

2. **"Frontend = Web"** - The assignment specifically requires mobile native UI, not web frontend

3. **"More tools = better"** - Tool diversity should serve the requirements, not be arbitrary

4. **"Deployment configuration"** - Looking for Docker files, CI/CD configs, or deployment scripts

## Automated Testing Considerations

Since we cannot run the code, we evaluate based on:
- File structure and organization
- Code completeness
- API endpoint definitions
- Database schema clarity
- Mobile UI code presence
- Integration points between components

The scoring system uses static analysis to verify these elements exist and are properly implemented based on code inspection.