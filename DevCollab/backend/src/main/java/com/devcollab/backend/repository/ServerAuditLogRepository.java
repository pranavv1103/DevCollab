package com.devcollab.backend.repository;

import com.devcollab.backend.entity.ServerAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServerAuditLogRepository extends JpaRepository<ServerAuditLog, Long> {
    @Query("SELECT sal FROM ServerAuditLog sal WHERE sal.server.id = :serverId ORDER BY sal.createdAt DESC")
    List<ServerAuditLog> findByServerIdOrderByCreatedAtDesc(@Param("serverId") Long serverId);
}
