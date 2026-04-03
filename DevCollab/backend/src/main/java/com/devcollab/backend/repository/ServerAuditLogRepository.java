package com.devcollab.backend.repository;

import com.devcollab.backend.entity.ServerAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerAuditLogRepository extends JpaRepository<ServerAuditLog, Long> {
    List<ServerAuditLog> findByServerIdOrderByCreatedAtDesc(Long serverId);
}
