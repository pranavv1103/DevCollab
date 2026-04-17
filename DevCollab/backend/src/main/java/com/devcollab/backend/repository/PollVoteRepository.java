package com.devcollab.backend.repository;

import com.devcollab.backend.entity.PollVote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PollVoteRepository extends JpaRepository<PollVote, Long> {

    @Query("SELECT v FROM PollVote v WHERE v.option.poll.id = :pollId AND v.votedBy.id = :userId")
    Optional<PollVote> findByPollIdAndUserId(@Param("pollId") Long pollId, @Param("userId") Long userId);

    @Query("SELECT COUNT(v) FROM PollVote v WHERE v.option.id = :optionId")
    int countByOptionId(@Param("optionId") Long optionId);

    boolean existsByOptionIdAndVotedById(Long optionId, Long userId);

    @Transactional
    @Modifying
    @Query("DELETE FROM PollVote v WHERE v.option.id = :optionId AND v.votedBy.id = :userId")
    void deleteByOptionIdAndVotedById(@Param("optionId") Long optionId, @Param("userId") Long userId);
}
