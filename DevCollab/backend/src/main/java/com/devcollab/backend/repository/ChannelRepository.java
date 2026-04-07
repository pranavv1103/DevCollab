package com.devcollab.backend.repository;

import com.devcollab.backend.entity.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {
    @Query("SELECT c FROM Channel c WHERE c.server.id = :serverId")
    List<Channel> findByServerId(@Param("serverId") Long serverId);
}
