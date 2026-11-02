from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, UniqueConstraint, CheckConstraint, func
from database import Base

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

class Module(Base):
    __tablename__ = "modules"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, default="", nullable=False)
    complexity = Column(Integer, default=3, nullable=False)
    __table_args__ = (UniqueConstraint("project_id", "name"), CheckConstraint("complexity BETWEEN 1 AND 5"))

class Dependency(Base):
    __tablename__ = "dependencies"
    id = Column(Integer, primary_key=True, index=True)
    source_module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    target_module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False)
    __table_args__ = (UniqueConstraint("source_module_id", "target_module_id"), CheckConstraint("source_module_id != target_module_id"))

class TestCase(Base):
    __tablename__ = "test_cases"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    status = Column(String(30), default="Not Run", nullable=False)

class ChangeAnalysis(Base):
    __tablename__ = "change_analyses"
    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    change_type = Column(String(30), nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_level = Column(String(20), nullable=False)
    result_json = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
