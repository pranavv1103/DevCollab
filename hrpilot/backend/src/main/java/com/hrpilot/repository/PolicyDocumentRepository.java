package com.hrpilot.repository;

import com.hrpilot.entity.DocumentStatus;
import com.hrpilot.entity.PolicyDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PolicyDocumentRepository extends JpaRepository<PolicyDocument, UUID> {
    List<PolicyDocument> findByCompanyId(UUID companyId);
    List<PolicyDocument> findByCompanyIdAndStatus(UUID companyId, DocumentStatus status);
    List<PolicyDocument> findByCompanyIdAndOriginalNameContainingIgnoreCase(UUID companyId, String name);
}
