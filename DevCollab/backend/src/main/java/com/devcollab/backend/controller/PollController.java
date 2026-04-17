package com.devcollab.backend.controller;

import com.devcollab.backend.entity.*;
import com.devcollab.backend.repository.*;
import com.devcollab.backend.security.services.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
@SuppressWarnings("null")
public class PollController {

    @Autowired PollRepository pollRepository;
    @Autowired PollOptionRepository pollOptionRepository;
    @Autowired PollVoteRepository pollVoteRepository;
    @Autowired ChannelRepository channelRepository;
    @Autowired UserRepository userRepository;
    @Autowired ServerMemberRepository serverMemberRepository;
    @Autowired SimpMessagingTemplate messagingTemplate;

    private UserDetailsImpl currentUser() {
        return (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    /** GET /api/channels/{channelId}/polls */
    @GetMapping("/channels/{channelId}/polls")
    public ResponseEntity<?> getPolls(@PathVariable Long channelId) {
        UserDetailsImpl ud = currentUser();
        Channel channel = channelRepository.findById(channelId).orElse(null);
        if (channel == null) return ResponseEntity.notFound().build();

        boolean isMember = serverMemberRepository
                .findByServerIdAndUserId(channel.getServer().getId(), ud.getId()).isPresent();
        if (!isMember) return ResponseEntity.status(403).build();

        List<Poll> polls = pollRepository.findByChannelIdOrderByCreatedAtDesc(channelId);
        return ResponseEntity.ok(polls);
    }

    /** POST /api/channels/{channelId}/polls */
    @PostMapping("/channels/{channelId}/polls")
    @Transactional
    public ResponseEntity<?> createPoll(
            @PathVariable Long channelId,
            @RequestBody Map<String, Object> body) {

        UserDetailsImpl ud = currentUser();
        Channel channel = channelRepository.findById(channelId).orElse(null);
        if (channel == null) return ResponseEntity.notFound().build();

        boolean isMember = serverMemberRepository
                .findByServerIdAndUserId(channel.getServer().getId(), ud.getId()).isPresent();
        if (!isMember) return ResponseEntity.status(403).build();

        String question = (String) body.get("question");
        @SuppressWarnings("unchecked")
        List<String> optionTexts = (List<String>) body.get("options");
        if (question == null || question.isBlank() || optionTexts == null || optionTexts.size() < 2) {
            return ResponseEntity.badRequest().body(Map.of("error", "Poll requires a question and at least 2 options"));
        }

        User creator = userRepository.findById(ud.getId()).orElse(null);
        if (creator == null) return ResponseEntity.status(403).build();

        Poll poll = Poll.builder()
                .question(question.trim())
                .channel(channel)
                .createdBy(creator)
                .createdAt(LocalDateTime.now())
                .options(new ArrayList<>())
                .build();

        for (String text : optionTexts) {
            if (text != null && !text.isBlank()) {
                PollOption opt = PollOption.builder()
                        .optionText(text.trim())
                        .poll(poll)
                        .votes(new ArrayList<>())
                        .build();
                poll.getOptions().add(opt);
            }
        }

        Poll saved = pollRepository.save(poll);

        // Broadcast new poll via WebSocket
        messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/polls", saved);
        return ResponseEntity.ok(saved);
    }

    /** POST /api/polls/{pollId}/vote — vote or change vote */
    @PostMapping("/polls/{pollId}/vote")
    @Transactional
    public ResponseEntity<?> vote(
            @PathVariable Long pollId,
            @RequestBody Map<String, Object> body) {

        UserDetailsImpl ud = currentUser();
        Poll poll = pollRepository.findById(pollId).orElse(null);
        if (poll == null) return ResponseEntity.notFound().build();

        Long optionId = Long.parseLong(body.get("optionId").toString());
        PollOption option = pollOptionRepository.findById(optionId).orElse(null);
        if (option == null || !option.getPoll().getId().equals(pollId)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid option"));
        }

        User voter = userRepository.findById(ud.getId()).orElse(null);
        if (voter == null) return ResponseEntity.status(403).build();

        // Remove existing vote for this poll (allow changing vote)
        Optional<PollVote> existing = pollVoteRepository.findByPollIdAndUserId(pollId, ud.getId());
        existing.ifPresent(v -> {
            // If same option, toggle off
            if (v.getOption().getId().equals(optionId)) {
                pollVoteRepository.delete(v);
            } else {
                pollVoteRepository.delete(v);
                PollVote newVote = PollVote.builder().option(option).votedBy(voter).build();
                pollVoteRepository.save(newVote);
            }
        });
        if (existing.isEmpty()) {
            PollVote newVote = PollVote.builder().option(option).votedBy(voter).build();
            pollVoteRepository.save(newVote);
        }

        // Reload poll with updated votes
        pollRepository.flush();
        Poll updated = pollRepository.findById(pollId).orElse(poll);

        Long channelId = poll.getChannelId();
        messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/polls/votes", updated);
        return ResponseEntity.ok(updated);
    }

    /** DELETE /api/polls/{pollId} — creator or OWNER/ADMIN can delete */
    @DeleteMapping("/polls/{pollId}")
    @Transactional
    public ResponseEntity<?> deletePoll(@PathVariable Long pollId) {
        UserDetailsImpl ud = currentUser();
        Poll poll = pollRepository.findById(pollId).orElse(null);
        if (poll == null) return ResponseEntity.notFound().build();

        Long serverId = poll.getChannel().getServer().getId();
        Optional<ServerMember> memberOpt = serverMemberRepository.findByServerIdAndUserId(serverId, ud.getId());
        boolean isCreator = poll.getCreatedBy().getId().equals(ud.getId());
        boolean isModerator = memberOpt.isPresent() &&
                (memberOpt.get().getRole() == ServerRole.OWNER || memberOpt.get().getRole() == ServerRole.ADMIN);

        if (!isCreator && !isModerator) return ResponseEntity.status(403).build();

        Long channelId = poll.getChannelId();
        pollRepository.delete(poll);
        messagingTemplate.convertAndSend("/topic/channels/" + channelId + "/polls/deleted", Map.of("pollId", pollId));
        return ResponseEntity.ok().build();
    }
}
