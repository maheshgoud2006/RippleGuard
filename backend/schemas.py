from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

ChangeType = Literal["bugfix", "feature", "refactor", "breaking"]

class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=2000)

class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    description: str

class ModuleCreate(BaseModel):
    project_id: int
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=2000)
    complexity: int = Field(default=3, ge=1, le=5)

class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    project_id: int
    name: str
    description: str
    complexity: int

class DependencyCreate(BaseModel):
    source_module_id: int
    target_module_id: int

class TestCreate(BaseModel):
    module_id: int
    name: str = Field(min_length=1, max_length=150)

class TestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    module_id: int
    name: str
    status: str

class AnalysisCreate(BaseModel):
    module_id: int
    change_type: ChangeType = "feature"
