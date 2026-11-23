package br.com.rpm33.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.com.rpm33.model.InteracaoAssistente;

public interface InteracaoAssistenteRepository extends JpaRepository<InteracaoAssistente, Long> {

  List<InteracaoAssistente> findTop100ByOrderByIdDesc();

  List<InteracaoAssistente> findByIsUtilNotNullOrderByIdAsc();

  /** Carga de demonstração (perfil dev): a conversa passa a ter acontecido na data dada. */
  @Modifying
  @Query(value = "UPDATE interacao_assistente SET data_cadastro = :data, "
      + "data_avaliacao = CASE WHEN is_util IS NULL THEN NULL ELSE CAST(:data AS timestamp) END "
      + "WHERE id = :id",
      nativeQuery = true)
  int retroagir(@Param("id") Long id, @Param("data") LocalDateTime data);
}
