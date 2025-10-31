from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.order import SellerApplicationStatus


class SellerApplication(Base):
    __tablename__ = "seller_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    marketplace_name = Column(String(255), nullable=False)
    contact_email = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=True)
    experience_level = Column(String(50), nullable=False)
    material_focus = Column(String(1000), nullable=True)
    status = Column(Enum(SellerApplicationStatus), nullable=False, default=SellerApplicationStatus.PENDING)

    user = relationship("User", back_populates="seller_applications")


