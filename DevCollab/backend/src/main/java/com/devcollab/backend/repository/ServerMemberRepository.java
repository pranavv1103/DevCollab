package com.devcollab.backend.repository;

import com.devcollab.backend.entity.ServerMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ServerMemberRepository extends JpaRepository<ServerMember, Long> {
    List<ServerMember> findByServerId(Long serverId);
    List<ServerMember> findByUserId(Long userId);
    Optional<ServerMember> findByServerIdAndUserId(Long serverId, Long userId);
}
