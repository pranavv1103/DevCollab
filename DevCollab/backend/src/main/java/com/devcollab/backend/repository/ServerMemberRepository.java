package com.devcollab.backend.repository;

import com.devcollab.backend.entity.ServerMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ServerMemberRepository extends JpaRepository<ServerMember, Long> {
    @Query("SELECT sm FROM ServerMember sm WHERE sm.server.id = :serverId")
    List<ServerMember> findByServerId(@Param("serverId") Long serverId);

    @Query("SELECT sm FROM ServerMember sm WHERE sm.user.id = :userId")
    List<ServerMember> findByUserId(@Param("userId") Long userId);

    @Query("SELECT sm FROM ServerMember sm WHERE sm.server.id = :serverId AND sm.user.id = :userId")
    Optional<ServerMember> findByServerIdAndUserId(@Param("serverId") Long serverId, @Param("userId") Long userId);
}
