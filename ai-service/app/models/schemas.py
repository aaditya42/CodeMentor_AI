"""
Pydantic schemas for the AI Service.
These mirror the TypeScript types in packages/shared/src/types.ts
to ensure contract compatibility between Node.js and Python.
"""

from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum


# ============================================
# Enums
# ============================================

class Difficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class Language(str, Enum):
    PYTHON = "PYTHON"
    CPP = "CPP"
    JAVA = "JAVA"
    JAVASCRIPT = "JAVASCRIPT"


class HintLevel(int, Enum):
    CONCEPTUAL = 1
    DIRECTIONAL = 2
    PSEUDOCODE = 3
    OPTIMIZATION = 4
    IMPLEMENTATION = 5


# ============================================
# AST Analysis Schemas
# ============================================

class ASTIssue(BaseModel):
    type: str = Field(..., description="Issue category: performance, bug, edge_case, style")
    severity: str = Field(..., description="Severity: info, warning, error")
    message: str
    line: Optional[int] = None


class OptimizationSuggestion(BaseModel):
    strategy: str
    expected_complexity: str
    description: str


class CodeStructure(BaseModel):
    functions: int = 0
    loops: int = 0
    nested_loop_depth: int = 0
    conditionals: int = 0
    recursive_calls: int = 0
    data_structures_used: list[str] = Field(default_factory=list)


class ASTAnalysisResult(BaseModel):
    language: str
    algorithm_pattern: str
    detected_patterns: list[str]
    estimated_time_complexity: str
    estimated_space_complexity: str
    issues: list[ASTIssue] = Field(default_factory=list)
    optimization_suggestions: list[OptimizationSuggestion] = Field(default_factory=list)
    recursion_detected: bool = False
    dp_potential: bool = False
    code_structure: CodeStructure = Field(default_factory=CodeStructure)


# ============================================
# Complexity Analysis Schemas
# ============================================

class ComplexitySuggestion(BaseModel):
    from_complexity: str = Field(..., alias="from")
    to_complexity: str = Field(..., alias="to")
    technique: str
    description: str

    model_config = {"populate_by_name": True}


class ComplexityAnalysisResult(BaseModel):
    time_complexity: str
    space_complexity: str
    is_tle_prone: bool = False
    redundant_computations: list[str] = Field(default_factory=list)
    suggestions: list[ComplexitySuggestion] = Field(default_factory=list)
    llm_analysis: Optional[str] = None  # LLM-augmented reasoning


# ============================================
# Request Schemas
# ============================================

class AnalyzeCodeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50000)
    language: Language
    problem_context: Optional[str] = None


class ComplexityRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50000)
    language: Language
    use_llm: bool = False  # If True, augment static analysis with LLM reasoning


class GenerateHintRequest(BaseModel):
    problem_id: str
    problem_title: str
    problem_description: str
    code: str = Field(..., min_length=1, max_length=50000)
    language: Language
    hint_level: HintLevel = HintLevel.CONCEPTUAL
    conversation_history: list[dict[str, str]] = Field(default_factory=list)
    user_message: Optional[str] = None
    ast_analysis: Optional[ASTAnalysisResult] = None
    complexity_analysis: Optional[ComplexityAnalysisResult] = None
    stream: bool = False


class RetrieveContextRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    difficulty: Optional[Difficulty] = None
    topics: Optional[list[str]] = None
    doc_type: Optional[str] = None


class EvaluateHintRequest(BaseModel):
    hint_id: str
    hint_content: str
    hint_level: int
    problem_description: str
    user_code: str


class IngestDocumentsRequest(BaseModel):
    documents: list["KnowledgeDocument"]
    rebuild_index: bool = False


class KnowledgeDocument(BaseModel):
    id: str
    content: str
    doc_type: str = Field(..., description="Type: problem, editorial, pattern, mistake, edge_case")
    difficulty: Optional[str] = None
    topics: Optional[list[str]] = None
    metadata: Optional[dict[str, Any]] = None


# ============================================
# Response Schemas
# ============================================

class AnalyzeCodeResponse(BaseModel):
    success: bool = True
    analysis: ASTAnalysisResult


class ComplexityResponse(BaseModel):
    success: bool = True
    analysis: ComplexityAnalysisResult


class HintResponse(BaseModel):
    success: bool = True
    content: str
    hint_level: int
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetrievalResult(BaseModel):
    document_id: str
    content: str
    score: float
    metadata: dict[str, Any] = Field(default_factory=dict)


class RetrieveContextResponse(BaseModel):
    success: bool = True
    results: list[RetrievalResult]
    latency_ms: float


class EvaluationResult(BaseModel):
    relevance_score: float = Field(ge=0, le=1)
    hallucination: bool = False
    solution_leakage: bool = False
    pedagogical_quality: float = Field(ge=0, le=1)
    reasoning: str = ""


class EvaluateHintResponse(BaseModel):
    success: bool = True
    evaluation: EvaluationResult


class HealthResponse(BaseModel):
    status: str = "healthy"
    version: str
    providers: dict[str, bool]
    faiss_loaded: bool = False
    knowledge_docs: int = 0


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    detail: Optional[str] = None
